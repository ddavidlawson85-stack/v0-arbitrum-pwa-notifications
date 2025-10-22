"use client"

import { SettingsDialog } from "./settings-dialog"
import Image from "next/image"
import { Bell } from "lucide-react"
import { Button } from "./ui/button"
import { subscribeToPushNotifications } from "@/lib/pwa/push-notifications"
import { getServiceWorkerRegistration } from "@/lib/pwa/register-sw"
import { useToast } from "@/hooks/use-toast"

interface DashboardHeaderProps {
  onRefresh: () => void
  onNotificationToggle: () => void
  isSubscribed: boolean
  delegateId: string | null
}

export function DashboardHeader({ onRefresh, onNotificationToggle, isSubscribed, delegateId }: DashboardHeaderProps) {
  const { toast } = useToast()

  const handleNotificationClick = async () => {
    try {
      console.log("[v0] Notification button clicked, isSubscribed:", isSubscribed)

      const isProduction = process.env.NODE_ENV === "production"
      if (!isProduction) {
        toast({
          title: "Production Only",
          description: "Push notifications only work in production. Please deploy to enable notifications.",
          variant: "destructive",
        })
        return
      }

      // Check if already subscribed
      if (isSubscribed) {
        toast({
          title: "Already Subscribed",
          description: "You're already receiving notifications. Manage them in settings.",
        })
        return
      }

      // Check if notifications are supported
      if (!("Notification" in window)) {
        console.error("[v0] Notifications not supported in this browser")
        toast({
          title: "Not Supported",
          description: "Your browser doesn't support notifications.",
          variant: "destructive",
        })
        return
      }

      // Check if service worker is supported
      if (!("serviceWorker" in navigator)) {
        console.error("[v0] Service workers not supported in this browser")
        toast({
          title: "Not Supported",
          description: "Your browser doesn't support push notifications.",
          variant: "destructive",
        })
        return
      }

      // Check VAPID key
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error("[v0] VAPID public key not configured")
        toast({
          title: "Configuration Error",
          description: "Push notifications are not properly configured. Please contact support.",
          variant: "destructive",
        })
        return
      }

      console.log("[v0] VAPID key available:", vapidKey.substring(0, 10) + "...")

      // Check current permission
      console.log("[v0] Current notification permission:", Notification.permission)

      if (Notification.permission === "granted") {
        // Already granted, just subscribe
        console.log("[v0] Permission already granted, getting service worker registration")
        const registration = await getServiceWorkerRegistration()

        if (!registration) {
          console.error("[v0] Service worker not registered")
          toast({
            title: "Service Worker Error",
            description: "Service worker is not registered. Please refresh the page and try again.",
            variant: "destructive",
          })
          return
        }

        console.log("[v0] Service worker registration found, subscribing to push")
        const subscription = await subscribeToPushNotifications(registration)
        console.log("[v0] Push subscription created, saving to server")

        const response = await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error("[v0] Failed to save subscription:", errorText)
          throw new Error("Failed to save subscription to server")
        }

        console.log("[v0] Subscription saved successfully")
        onNotificationToggle()
        toast({
          title: "Subscribed",
          description: "You'll now receive push notifications for new proposals.",
        })
        return
      }

      // Request permission
      console.log("[v0] Requesting notification permission")
      const permission = await Notification.requestPermission()
      console.log("[v0] Permission result:", permission)

      if (permission === "granted") {
        console.log("[v0] Permission granted, getting service worker registration")
        const registration = await getServiceWorkerRegistration()

        if (!registration) {
          console.error("[v0] Service worker not registered")
          toast({
            title: "Service Worker Error",
            description: "Service worker is not registered. Please refresh the page and try again.",
            variant: "destructive",
          })
          return
        }

        console.log("[v0] Service worker registration found, subscribing to push")
        const subscription = await subscribeToPushNotifications(registration)
        console.log("[v0] Push subscription created, saving to server")

        const response = await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error("[v0] Failed to save subscription:", errorText)
          throw new Error("Failed to save subscription to server")
        }

        console.log("[v0] Subscription saved successfully")
        onNotificationToggle()
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive push notifications for new proposals.",
        })
      } else {
        console.log("[v0] Permission denied by user")
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error enabling notifications:", error)
      // Log more details
      if (error instanceof Error) {
        console.error("[v0] Error message:", error.message)
        console.error("[v0] Error stack:", error.stack)
      }
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to enable notifications. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-1gUXnOp26VYSI6eyFrA1tWVmZuK1r7.png"
                alt="Arbitrum"
                width={40}
                height={40}
                className="rounded-xl"
              />
              <span className="text-xl font-bold text-foreground">DAOVote</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNotificationClick}
              className="rounded-xl hover:bg-accent"
              aria-label="Enable notifications"
            >
              <Bell className="h-5 w-5" />
            </Button>
            {isSubscribed && <SettingsDialog delegateId={delegateId} />}
          </div>
        </div>
      </div>
    </header>
  )
}
