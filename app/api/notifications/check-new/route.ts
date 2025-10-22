import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const supabase = await createClient()

    // Step 1: Check for new proposals created in the last 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()

    const { data: recentProposals, error: proposalsError } = await supabase
      .from("proposals")
      .select("id, title, source, created_at")
      .gte("created_at", sixHoursAgo)
      .order("created_at", { ascending: false })

    if (proposalsError) {
      throw proposalsError
    }

    // Step 2: Check for proposals ending in 24 hours (±1 hour window)
    const twentyThreeHoursFromNow = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()
    const twentyFiveHoursFromNow = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()

    const { data: endingSoonProposals, error: endingError } = await supabase
      .from("proposals")
      .select("id, title, source, voting_ends_at")
      .gte("voting_ends_at", twentyThreeHoursFromNow)
      .lte("voting_ends_at", twentyFiveHoursFromNow)
      .in("source", ["tally", "snapshot"]) // Only Tally and Snapshot have voting deadlines
      .in("status", ["active"]) // Only notify for active proposals

    if (endingError) {
      throw endingError
    }

    const newProposalsToNotify = []
    const endingSoonToNotify = []

    // Check which new proposals have already been notified
    if (recentProposals && recentProposals.length > 0) {
      const { data: existingNewNotifications } = await supabase
        .from("notifications")
        .select("proposal_id")
        .in(
          "proposal_id",
          recentProposals.map((p) => p.id),
        )
        .eq("notification_type", "new_proposal")

      const notifiedNewIds = new Set(existingNewNotifications?.map((n) => n.proposal_id) || [])
      newProposalsToNotify.push(...recentProposals.filter((p) => !notifiedNewIds.has(p.id)))
    }

    // Check which ending soon proposals have already been notified
    if (endingSoonProposals && endingSoonProposals.length > 0) {
      const { data: existingEndingNotifications } = await supabase
        .from("notifications")
        .select("proposal_id")
        .in(
          "proposal_id",
          endingSoonProposals.map((p) => p.id),
        )
        .eq("notification_type", "ending_soon")

      const notifiedEndingIds = new Set(existingEndingNotifications?.map((n) => n.proposal_id) || [])
      endingSoonToNotify.push(...endingSoonProposals.filter((p) => !notifiedEndingIds.has(p.id)))
    }

    const notificationResults = []

    // Send notifications for new proposals
    for (const proposal of newProposalsToNotify) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/notifications/send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              proposalId: proposal.id,
              notificationType: "new_proposal",
            }),
          },
        )

        const result = await response.json()
        notificationResults.push({
          proposalId: proposal.id,
          title: proposal.title,
          type: "new_proposal",
          result,
        })
      } catch (error) {
        console.error(`[v0] Error notifying new proposal ${proposal.id}:`, error)
      }
    }

    // Send notifications for proposals ending soon
    for (const proposal of endingSoonToNotify) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/notifications/send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              proposalId: proposal.id,
              notificationType: "ending_soon",
            }),
          },
        )

        const result = await response.json()
        notificationResults.push({
          proposalId: proposal.id,
          title: proposal.title,
          type: "ending_soon",
          result,
        })
      } catch (error) {
        console.error(`[v0] Error notifying ending soon proposal ${proposal.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      newProposals: newProposalsToNotify.length,
      endingSoon: endingSoonToNotify.length,
      results: notificationResults,
      message: `Processed ${newProposalsToNotify.length} new proposals and ${endingSoonToNotify.length} ending soon`,
    })
  } catch (error) {
    console.error("[v0] Error checking for notifications:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
