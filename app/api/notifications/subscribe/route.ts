import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { endpoint, p256dh, auth } = await request.json()

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Missing subscription data" }, { status: 400 })
    }

    // Create or get delegate (for now, we'll use a temporary ID)
    // In production, you'd get this from the authenticated user
    const { data: delegate, error: delegateError } = await supabase
      .from("delegates")
      .upsert(
        {
          email: "anonymous@example.com", // Replace with actual user email when auth is implemented
          display_name: "Anonymous User",
        },
        { onConflict: "email" },
      )
      .select()
      .single()

    if (delegateError) {
      console.error("[v0] Error creating delegate:", delegateError)
      return NextResponse.json({ error: "Failed to create delegate" }, { status: 500 })
    }

    // Save push subscription
    const { error: subscriptionError } = await supabase.from("push_subscriptions").upsert(
      {
        delegate_id: delegate.id,
        endpoint,
        p256dh,
        auth,
      },
      { onConflict: "delegate_id,endpoint" },
    )

    if (subscriptionError) {
      console.error("[v0] Error saving subscription:", subscriptionError)
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
    }

    console.log("[v0] Push subscription saved successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in subscribe endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
