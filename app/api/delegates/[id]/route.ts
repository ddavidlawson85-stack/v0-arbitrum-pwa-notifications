import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("delegates")
      .select(
        `
        *,
        notification_preferences (*),
        push_subscriptions (*)
      `,
      )
      .eq("id", id)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      delegate: data,
    })
  } catch (error) {
    console.error("[v0] Error fetching delegate:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { displayName, email, walletAddress } = body

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("delegates")
      .update({
        display_name: displayName,
        email: email,
        wallet_address: walletAddress,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      delegate: data,
      message: "Profile updated successfully",
    })
  } catch (error) {
    console.error("[v0] Error updating delegate:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
