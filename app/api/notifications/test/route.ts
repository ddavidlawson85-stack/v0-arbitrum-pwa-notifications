import { NextResponse } from "next/server"
import { sendBulkPushNotifications } from "@/lib/notifications/web-push-native"

export async function POST() {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "VAPID keys not configured. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.",
          sent: 0,
          failed: 0,
        },
        { status: 500 },
      )
    }

    // Use Supabase REST API directly to avoid import issues
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase not configured",
          sent: 0,
          failed: 0,
        },
        { status: 500 },
      )
    }

    // Fetch all push subscriptions
    const response = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?select=*`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch subscriptions: ${response.statusText}`,
          sent: 0,
          failed: 0,
        },
        { status: 500 },
      )
    }

    const subscriptions = await response.json()

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No subscribers found",
        sent: 0,
        failed: 0,
      })
    }

    console.log(`[v0] Sending test notification to ${subscriptions.length} subscribers`)

    // Send test notification
    const payload = {
      title: "Test Notification",
      body: "Your Arbitrum governance notifications are working! 🎉",
      url: process.env.NEXT_PUBLIC_APP_URL || "https://arbitrum-gov.app",
      proposalId: "test",
    }

    let result
    try {
      result = await sendBulkPushNotifications(subscriptions, payload)
    } catch (sendError) {
      console.error("[v0] Error in sendBulkPushNotifications:", sendError)
      return NextResponse.json(
        {
          success: false,
          error: sendError instanceof Error ? sendError.message : "Failed to send notifications",
          sent: 0,
          failed: subscriptions.length,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      sent: result.success,
      failed: result.failed,
      message: `Sent ${result.success} test notifications, ${result.failed} failed`,
    })
  } catch (error) {
    console.error("[v0] Error sending test notifications:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        sent: 0,
        failed: 0,
      },
      { status: 500 },
    )
  }
}
