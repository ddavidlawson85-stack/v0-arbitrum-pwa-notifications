// Native Web Push implementation without external dependencies
// Uses Web Crypto API and fetch to send push notifications

export interface PushNotificationPayload {
  title: string
  body: string
  url: string
  proposalId: string
}

export interface PushSubscriptionInfo {
  endpoint: string
  p256dh: string
  auth: string
}

// Convert base64url to Uint8Array
function base64UrlToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Convert Uint8Array to base64url
function uint8ArrayToBase64Url(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...array))
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

// Create JWT for VAPID
async function createVapidAuthToken(audience: string, subject: string, privateKey: string): Promise<string> {
  const header = {
    typ: "JWT",
    alg: "ES256",
  }

  const jwtPayload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: subject,
  }

  const encodedHeader = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)))
  const encodedPayload = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(jwtPayload)))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`

  // Import private key
  const privateKeyBuffer = base64UrlToUint8Array(privateKey)
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    false,
    ["sign"],
  )

  // Sign the token
  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    cryptoKey,
    new TextEncoder().encode(unsignedToken),
  )

  const encodedSignature = uint8ArrayToBase64Url(new Uint8Array(signature))
  return `${unsignedToken}.${encodedSignature}`
}

export async function sendPushNotification(
  subscription: PushSubscriptionInfo,
  payload: PushNotificationPayload,
): Promise<boolean> {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@arbitrum-gov.app"

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[v0] VAPID keys not configured")
      return false
    }

    // Parse endpoint to get audience
    const endpointUrl = new URL(subscription.endpoint)
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`

    // Create VAPID auth token
    const vapidToken = await createVapidAuthToken(audience, vapidSubject, vapidPrivateKey)

    // Prepare headers
    const headers: Record<string, string> = {
      TTL: "86400", // 24 hours
      "Content-Encoding": "aes128gcm",
      Authorization: `vapid t=${vapidToken}, k=${vapidPublicKey}`,
    }

    // Send notification
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })

    if (response.ok || response.status === 201) {
      console.log("[v0] Push notification sent successfully")
      return true
    } else {
      console.error(`[v0] Push notification failed: ${response.status} ${response.statusText}`)
      return false
    }
  } catch (error) {
    console.error("[v0] Error sending push notification:", error)
    return false
  }
}

export async function sendBulkPushNotifications(
  subscriptions: PushSubscriptionInfo[],
  payload: PushNotificationPayload,
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  const promises = subscriptions.map(async (subscription) => {
    const result = await sendPushNotification(subscription, payload)
    if (result) {
      success++
    } else {
      failed++
    }
  })

  await Promise.all(promises)

  console.log(`[v0] Bulk notifications sent: ${success} success, ${failed} failed`)
  return { success, failed }
}
