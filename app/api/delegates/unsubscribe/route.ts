import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ success: false, error: "Subscription endpoint is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed from notifications",
    })
  } catch (error) {
    console.error("[v0] Error unsubscribing delegate:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
