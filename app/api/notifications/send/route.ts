import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendBulkPushNotifications } from "@/lib/notifications/web-push"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { proposalId, notificationType = "new_proposal" } = body

    if (!proposalId) {
      return NextResponse.json({ success: false, error: "Proposal ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get proposal details
    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", proposalId)
      .single()

    if (proposalError || !proposal) {
      return NextResponse.json({ success: false, error: "Proposal not found" }, { status: 404 })
    }

    // Get all delegates with their subscriptions and preferences
    const { data: delegates, error: delegatesError } = await supabase
      .from("delegates")
      .select(
        `
        id,
        push_subscriptions (
          endpoint,
          p256dh,
          auth
        ),
        notification_preferences (
          notify_discourse,
          notify_snapshot,
          notify_tally,
          notify_active_only
        )
      `,
      )
      .not("push_subscriptions", "is", null)

    if (delegatesError) {
      throw delegatesError
    }

    // Filter delegates based on their preferences
    const eligibleDelegates = []

    for (const delegate of delegates || []) {
      const prefs = delegate.notification_preferences?.[0]
      const subscriptions = delegate.push_subscriptions || []

      if (subscriptions.length === 0) continue

      // Check if delegate wants notifications for this source
      const shouldNotify =
        (proposal.source === "discourse" && prefs?.notify_discourse !== false) ||
        (proposal.source === "snapshot" && prefs?.notify_snapshot !== false) ||
        (proposal.source === "tally" && prefs?.notify_tally !== false)

      // Check if delegate only wants active proposals
      const isActiveOrNoFilter = !prefs?.notify_active_only || proposal.status === "active"

      if (shouldNotify && isActiveOrNoFilter) {
        eligibleDelegates.push({
          id: delegate.id,
          subscriptions,
        })
      }
    }

    if (eligibleDelegates.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No eligible subscribers for this proposal",
        sent: 0,
      })
    }

    const payload =
      notificationType === "ending_soon"
        ? {
            title: `Voting ends in 24 hours!`,
            body: `${proposal.title} (${proposal.source})`,
            url: proposal.url,
            proposalId: proposal.id,
          }
        : {
            title: `New ${proposal.source} proposal`,
            body: proposal.title,
            url: proposal.url,
            proposalId: proposal.id,
          }

    // Send notifications to all eligible delegates
    const allSubscriptions = eligibleDelegates.flatMap((d) => d.subscriptions)
    const result = await sendBulkPushNotifications(allSubscriptions, payload)

    const notificationRecords = eligibleDelegates.map((delegate) => ({
      proposal_id: proposalId,
      delegate_id: delegate.id,
      notification_type: notificationType,
    }))

    await supabase.from("notifications").insert(notificationRecords)

    return NextResponse.json({
      success: true,
      sent: result.success,
      failed: result.failed,
      notificationType,
      message: `Sent ${result.success} notifications, ${result.failed} failed`,
    })
  } catch (error) {
    console.error("[v0] Error sending notifications:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
