"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { subscribeToPushNotifications } from "@/lib/pwa/push-notifications"
import { getServiceWorkerRegistration } from "@/lib/pwa/register-sw"

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

export function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const isPWA = window.matchMedia("(display-mode: standalone)").matches
    if (!isPWA) return

    const dismissedUntil = localStorage.getItem("notification-prompt-dismissed-until")
    if (dismissedUntil) {
      const dismissedTime = Number.parseInt(dismissedUntil, 10)
      const now = Date.now()
      // Show prompt again after 30 days
      if (now < dismissedTime) {
        return
      } else {
        // Clear expired dismissal
        localStorage.removeItem("notification-prompt-dismissed-until")
      }
    }

    if (Notification.permission === "granted") {
      return
    }

    const timer = setTimeout(() => {
      setShowPrompt(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const handleEnableNotifications = async () => {
    setIsLoading(true)
    try {
      console.log("[v0] Starting notification enable process...")

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error("[v0] VAPID public key not configured")
        throw new Error("Push notifications are not configured. Please contact support.")
      }
      console.log("[v0] VAPID key available:", vapidKey.substring(0, 20) + "...")

      const permission = await Notification.requestPermission()
      console.log("[v0] Notification permission:", permission)

      if (permission !== "granted") {
        throw new Error("Notification permission was denied. Please enable notifications in your browser settings.")
      }

      console.log("[v0] Getting service worker registration...")
      const registration = await getServiceWorkerRegistration()

      if (!registration) {
        console.error("[v0] Service worker not registered")
        throw new Error("Service worker not available. Please refresh the page and try again.")
      }
      console.log("[v0] Service worker registered successfully")

      console.log("[v0] Creating push subscription...")
      const subscription = await subscribeToPushNotifications(registration)
      console.log("[v0] Push subscription created:", subscription)

      console.log("[v0] Saving subscription to server...")
      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("[v0] Server error:", errorData)
        throw new Error(`Failed to save subscription: ${errorData.error || response.statusText}`)
      }

      console.log("[v0] Notifications enabled successfully")
      setShowPrompt(false)
      const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000
      localStorage.setItem("notification-prompt-dismissed-until", thirtyDaysFromNow.toString())
    } catch (error) {
      console.error("[v0] Error enabling notifications:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to enable notifications. Please try again."
      alert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000
    localStorage.setItem("notification-prompt-dismissed-until", thirtyDaysFromNow.toString())
  }

  if (!showPrompt) return null

  return (
    <div className="fixed top-16 left-4 right-4 z-50 animate-in slide-in-from-top-5 duration-300 md:left-auto md:right-4 md:max-w-md">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <BellIcon />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground mb-3">
              Enable notifications to get updates when new proposals are posted.
            </p>

            <Button
              onClick={handleEnableNotifications}
              size="sm"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-9"
              disabled={isLoading}
            >
              {isLoading ? "Enabling..." : "Enable Notifications"}
            </Button>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -mr-1"
            aria-label="Close"
          >
            <XIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
