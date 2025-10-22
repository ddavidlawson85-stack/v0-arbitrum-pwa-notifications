import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        configured: {
          supabase: false,
          vapidPublicKey: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          vapidPrivateKey: !!process.env.VAPID_PRIVATE_KEY,
          vapidSubject: !!process.env.VAPID_SUBJECT,
        },
        subscriptionCount: 0,
        ready: false,
        message: "Supabase not configured",
      })
    }

    // Check VAPID keys
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    const vapidSubject = process.env.VAPID_SUBJECT

    // Fetch subscriptions count
    let subscriptionCount = 0
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?select=count`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "count=exact",
        },
      })

      if (response.ok) {
        const countHeader = response.headers.get("content-range")
        if (countHeader) {
          const match = countHeader.match(/\/(\d+)/)
          if (match) {
            subscriptionCount = Number.parseInt(match[1], 10)
          }
        }
      }
    } catch (fetchError) {
      console.error("[v0] Error fetching subscription count:", fetchError)
      // Continue with count = 0
    }

    return NextResponse.json({
      configured: {
        supabase: true,
        vapidPublicKey: !!vapidPublicKey,
        vapidPrivateKey: !!vapidPrivateKey,
        vapidSubject: !!vapidSubject,
      },
      subscriptionCount,
      ready: !!(vapidPublicKey && vapidPrivateKey && vapidSubject),
      message:
        subscriptionCount === 0
          ? "No push subscriptions yet. Enable notifications in the app to subscribe."
          : `${subscriptionCount} user(s) subscribed to notifications.`,
    })
  } catch (error) {
    console.error("[v0] Error checking subscriptions:", error)
    return NextResponse.json(
      {
        error: "Failed to check subscriptions",
        configured: {
          supabase: false,
          vapidPublicKey: false,
          vapidPrivateKey: false,
          vapidSubject: false,
        },
        subscriptionCount: 0,
        ready: false,
      },
      { status: 500 },
    )
  }
}
