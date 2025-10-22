import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { walletAddress, email, displayName, subscription } = body

    if (!walletAddress && !email) {
      return NextResponse.json({ success: false, error: "Either wallet address or email is required" }, { status: 400 })
    }

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ success: false, error: "Push subscription data is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Create or update delegate
    const { data: delegate, error: delegateError } = await supabase
      .from("delegates")
      .upsert(
        {
          wallet_address: walletAddress || null,
          email: email || null,
          display_name: displayName || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: walletAddress ? "wallet_address" : "email",
          ignoreDuplicates: false,
        },
      )
      .select()
      .single()

    if (delegateError) {
      throw delegateError
    }

    // Save push subscription
    const { error: subscriptionError } = await supabase.from("push_subscriptions").upsert(
      {
        delegate_id: delegate.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
      {
        onConflict: "delegate_id,endpoint",
        ignoreDuplicates: false,
      },
    )

    if (subscriptionError) {
      throw subscriptionError
    }

    return NextResponse.json({
      success: true,
      delegateId: delegate.id,
      message: "Successfully subscribed to notifications",
    })
  } catch (error) {
    console.error("[v0] Error subscribing delegate:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
