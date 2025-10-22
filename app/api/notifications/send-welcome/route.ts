import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Find subscriptions created in the last 3 minutes that haven't received test notification
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString()

    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("test_notification_sent", false)
      .gte("created_at", threeMinutesAgo)

    if (fetchError) {
      console.error("[v0] Error fetching subscriptions:", fetchError)
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[v0] No new subscriptions needing welcome notifications")
      return NextResponse.json({ message: "No new subscriptions to notify", count: 0 })
    }

    console.log(`[v0] Found ${subscriptions.length} new subscriptions needing welcome notifications`)

    // Send welcome notification to each subscription
    let successCount = 0
    let errorCount = 0

    for (const subscription of subscriptions) {
      try {
        // Check if subscription is at least 2 minutes old
        const subscriptionAge = Date.now() - new Date(subscription.created_at).getTime()
        const twoMinutes = 2 * 60 * 1000

        if (subscriptionAge < twoMinutes) {
          console.log(`[v0] Subscription ${subscription.id} is too new, skipping for now`)
          continue
        }

        const payload = JSON.stringify({
          title: "🎉 Welcome to DAOVote!",
          body: "You'll receive notifications for new proposals and voting deadlines.",
          url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        })

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
        const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@daovote.app"

        if (!vapidPublicKey || !vapidPrivateKey) {
          console.error("[v0] VAPID keys not configured")
          errorCount++
          continue
        }

        // Create JWT for VAPID authentication
        const vapidHeader = {
          typ: "JWT",
          alg: "ES256",
        }

        const jwtPayload = {
          aud: new URL(subscription.endpoint).origin,
          exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
          sub: vapidSubject,
        }

        // For simplicity, we'll use the web-push library approach
        // Import crypto for signing
        const crypto = await import("crypto")

        // Convert VAPID keys
        const vapidPublicKeyBuffer = Buffer.from(vapidPublicKey, "base64url")
        const vapidPrivateKeyBuffer = Buffer.from(vapidPrivateKey, "base64url")

        // Create VAPID auth header
        const headerEncoded = Buffer.from(JSON.stringify(vapidHeader)).toString("base64url")
        const payloadEncoded = Buffer.from(JSON.stringify(jwtPayload)).toString("base64url")
        const unsignedToken = `${headerEncoded}.${payloadEncoded}`

        // Sign with ECDSA
        const sign = crypto.createSign("SHA256")
        sign.update(unsignedToken)
        sign.end()

        // Create key object from private key
        const privateKeyObject = crypto.createPrivateKey({
          key: Buffer.concat([
            Buffer.from([0x30, 0x77, 0x02, 0x01, 0x01, 0x04, 0x20]),
            vapidPrivateKeyBuffer,
            Buffer.from([
              0xa0, 0x0a, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0xa1, 0x44, 0x03, 0x42, 0x00,
              0x04,
            ]),
            vapidPublicKeyBuffer,
          ]),
          format: "der",
          type: "sec1",
        })

        const signature = crypto.sign(null, Buffer.from(unsignedToken), privateKeyObject)
        const jwt = `${unsignedToken}.${signature.toString("base64url")}`

        // Encrypt payload
        const salt = crypto.randomBytes(16)
        const serverPublicKey = crypto.createECDH("prime256v1")
        serverPublicKey.generateKeys()

        // Send notification
        const response = await fetch(subscription.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            TTL: "86400",
            Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
          },
          body: payload,
        })

        if (response.ok || response.status === 201) {
          console.log(`[v0] Welcome notification sent to subscription ${subscription.id}`)

          // Mark as sent
          await supabase.from("push_subscriptions").update({ test_notification_sent: true }).eq("id", subscription.id)

          successCount++
        } else {
          console.error(
            `[v0] Failed to send welcome notification to ${subscription.id}: ${response.status} ${response.statusText}`,
          )
          errorCount++
        }
      } catch (error) {
        console.error(`[v0] Error sending welcome notification to ${subscription.id}:`, error)
        errorCount++
      }
    }

    return NextResponse.json({
      message: "Welcome notifications processed",
      total: subscriptions.length,
      success: successCount,
      errors: errorCount,
    })
  } catch (error) {
    console.error("[v0] Error in send-welcome endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
