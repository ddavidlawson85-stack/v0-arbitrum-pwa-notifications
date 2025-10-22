import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const delegateId = searchParams.get("delegateId")

    if (!delegateId) {
      return NextResponse.json({ success: false, error: "Delegate ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("delegate_id", delegateId)
      .single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    return NextResponse.json({
      success: true,
      preferences: data || {
        notify_discourse: true,
        notify_snapshot: true,
        notify_tally: true,
        notify_active_only: false,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching preferences:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { delegateId, preferences } = body

    if (!delegateId) {
      return NextResponse.json({ success: false, error: "Delegate ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          delegate_id: delegateId,
          notify_discourse: preferences.notify_discourse,
          notify_snapshot: preferences.notify_snapshot,
          notify_tally: preferences.notify_tally,
          notify_active_only: preferences.notify_active_only,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "delegate_id",
        },
      )
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      preferences: data,
      message: "Preferences updated successfully",
    })
  } catch (error) {
    console.error("[v0] Error updating preferences:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
