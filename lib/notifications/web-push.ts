import webpush from "web-push"

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

let vapidInitialized = false

function initializeVapid() {
  if (vapidInitialized) return

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@arbitrum-gov.app"

  // Only initialize if keys are properly set (not empty strings)
  if (vapidPublicKey && vapidPrivateKey && vapidPublicKey.length > 20 && vapidPrivateKey.length > 20) {
    try {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
      vapidInitialized = true
      console.log("[v0] VAPID details initialized successfully")
    } catch (error) {
      console.error("[v0] Failed to initialize VAPID details:", error)
      throw new Error("Invalid VAPID keys configuration")
    }
  } else {
    throw new Error("VAPID keys are not properly configured")
  }
}

export async function sendPushNotification(
  subscription: PushSubscriptionInfo,
  payload: PushNotificationPayload,
): Promise<boolean> {
  try {
    initializeVapid()

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    }

    await webpush.sendNotification(pushSubscription, JSON.stringify(payload))
    console.log("[v0] Push notification sent successfully")
    return true
  } catch (error) {
    console.error("[v0] Error sending push notification:", error)
    return false
  }
}

export async function sendBulkPushNotifications(
  subscriptions: PushSubscriptionInfo[],
  payload: PushNotificationPayload,
): Promise<{ success: number; failed: number }> {
  initializeVapid()

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
