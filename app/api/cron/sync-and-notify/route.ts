import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("[v0] Starting cron job: sync and notify")

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Step 1: Sync proposals from all sources
    const syncResponse = await fetch(`${baseUrl}/api/proposals/sync`, {
      method: "POST",
    })

    const syncResult = await syncResponse.json()
    console.log("[v0] Sync result:", syncResult)

    // Step 2: Check for new proposals and send notifications
    const notifyResponse = await fetch(`${baseUrl}/api/notifications/check-new`, {
      method: "POST",
    })

    const notifyResult = await notifyResponse.json()
    console.log("[v0] Notify result:", notifyResult)

    const welcomeResponse = await fetch(`${baseUrl}/api/notifications/send-welcome`, {
      method: "POST",
    })

    const welcomeResult = await welcomeResponse.json()
    console.log("[v0] Welcome notifications result:", welcomeResult)

    return NextResponse.json({
      success: true,
      sync: syncResult,
      notify: notifyResult,
      welcome: welcomeResult,
      message: "Cron job completed successfully",
    })
  } catch (error) {
    console.error("[v0] Error in cron job:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
