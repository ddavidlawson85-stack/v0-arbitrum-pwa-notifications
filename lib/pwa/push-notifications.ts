export interface PushSubscriptionData {
  endpoint: string
  p256dh: string
  auth: string
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    throw new Error("This browser does not support notifications")
  }

  const permission = await Notification.requestPermission()
  console.log("[v0] Notification permission:", permission)
  return permission
}

export async function subscribeToPushNotifications(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscriptionData> {
  try {
    // Request notification permission first
    const permission = await requestNotificationPermission()

    if (permission !== "granted") {
      throw new Error("Notification permission denied")
    }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""),
    })

    // Convert subscription to our format
    const subscriptionJSON = subscription.toJSON()

    if (!subscriptionJSON.keys) {
      throw new Error("Invalid subscription format")
    }

    return {
      endpoint: subscription.endpoint,
      p256dh: subscriptionJSON.keys.p256dh || "",
      auth: subscriptionJSON.keys.auth || "",
    }
  } catch (error) {
    console.error("[v0] Failed to subscribe to push notifications:", error)
    throw error
  }
}

export async function unsubscribeFromPushNotifications(registration: ServiceWorkerRegistration): Promise<void> {
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await subscription.unsubscribe()
    console.log("[v0] Unsubscribed from push notifications")
  }
}

export async function getPushSubscription(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  return await registration.pushManager.getSubscription()
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
