import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const config = {
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "✓ Set" : "✗ Missing",
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ? "✓ Set" : "✗ Missing",
    vapidSubject: process.env.VAPID_SUBJECT || "mailto:admin@arbitrum-gov.app",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Set" : "✗ Missing",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓ Set" : "✗ Missing",
    environment: process.env.NODE_ENV,
  }

  // Validate VAPID key format
  let vapidKeyValid = false
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      // VAPID public key should be 65 bytes when decoded (base64url encoded)
      const padding = "=".repeat((4 - (key.length % 4)) % 4)
      const base64 = (key + padding).replace(/-/g, "+").replace(/_/g, "/")
      const decoded = atob(base64)
      vapidKeyValid = decoded.length === 65
    } catch (error) {
      vapidKeyValid = false
    }
  }

  return NextResponse.json({
    ...config,
    vapidKeyValid: vapidKeyValid ? "✓ Valid format" : "✗ Invalid format",
    status: config.vapidPublicKey === "✓ Set" && config.vapidPrivateKey === "✓ Set" ? "ready" : "not_configured",
  })
}
