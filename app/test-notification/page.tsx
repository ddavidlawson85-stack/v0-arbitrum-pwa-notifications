"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, CheckCircle2, XCircle } from "lucide-react"
import { requestNotificationPermission } from "@/lib/pwa/push-notifications"

type NotificationPermission = "default" | "granted" | "denied"
type NotificationType = "snapshot" | "tally" | "custom"

export default function TestNotificationPage() {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [status, setStatus] = useState<string>("")
  const [selectedType, setSelectedType] = useState<NotificationType>("snapshot")
  const [serverStatus, setServerStatus] = useState<string>("")
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    checkPermission()
  }, [])

  const checkPermission = () => {
    if ("Notification" in window) {
      const perm = Notification.permission
      setPermission(perm)
      console.log("[v0] Notification permission:", perm)
      return perm
    }
    return "default"
  }

  const handleRequestPermission = async () => {
    setStatus("Requesting permission...")
    try {
      const result = await requestNotificationPermission()
      setPermission(checkPermission())
      if (result) {
        setStatus("Permission granted! You can now test notifications.")
      } else {
        setStatus("Permission denied. Please enable notifications in your browser settings.")
      }
    } catch (error) {
      setStatus("Error requesting permission: " + (error as Error).message)
    }
  }

  const sendTestNotification = async () => {
    if (Notification.permission !== "granted") {
      setStatus("Please grant notification permission first.")
      return
    }

    setStatus("Sending test notification...")

    const notifications = {
      snapshot: {
        title: "New snapshot proposal",
        body: "Should Arbitrum DAO fund the development of a new DeFi protocol?",
        url: "https://snapshot.org/#/arbitrumfoundation.eth",
      },
      tally: {
        title: "New tally proposal",
        body: "Proposal to increase the gas limit for Arbitrum One",
        url: "https://www.tally.xyz/gov/arbitrum",
      },
      custom: {
        title: "Proposal ending soon!",
        body: 'Vote on "Treasury Management Strategy" - Ends in 2d 5h',
        url: window.location.origin,
      },
    }

    const notif = notifications[selectedType]

    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(notif.title, {
        body: notif.body,
        icon: "/icon-192.jpg",
        badge: "/icon-192.jpg",
        vibrate: [200, 100, 200],
        data: {
          url: notif.url,
        },
        actions: [
          { action: "view", title: "View Proposal" },
          { action: "dismiss", title: "Dismiss" },
        ],
        requireInteraction: false,
        tag: "test-notification",
      })
      setStatus(`✓ ${selectedType} notification sent successfully!`)
    } catch (error) {
      setStatus("Error sending notification: " + (error as Error).message)
    }
  }

  const sendServerTestNotification = async () => {
    setIsSending(true)
    setServerStatus("Sending test notification to all subscribers...")

    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setServerStatus(
          `✓ Successfully sent ${data.sent} notifications! ${data.failed > 0 ? `(${data.failed} failed)` : ""}`,
        )
      } else {
        setServerStatus(`✗ Error: ${data.error}`)
      }
    } catch (error) {
      setServerStatus(`✗ Error: ${(error as Error).message}`)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Notification Test</h1>
            <p className="text-muted-foreground">Test push notifications for DAOVote</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Permission Status</CardTitle>
            <CardDescription>Check and request notification permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                {permission === "granted" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium">Current Permission</p>
                  <p className="text-sm text-muted-foreground capitalize">{permission}</p>
                </div>
              </div>
              <Button onClick={checkPermission} variant="outline" size="sm">
                Check
              </Button>
            </div>

            {permission !== "granted" && (
              <Button onClick={handleRequestPermission} className="w-full" size="lg">
                <Bell className="mr-2 h-4 w-4" />
                Request Permission
              </Button>
            )}

            {status && <div className="rounded-lg bg-muted p-3 text-sm">{status}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Notifications</CardTitle>
            <CardDescription>Select a notification type and send a test</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Notification Type</label>
              <Select value={selectedType} onValueChange={(value) => setSelectedType(value as NotificationType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select notification type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="snapshot">
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">Snapshot Proposal</span>
                      <span className="text-xs text-muted-foreground">New governance proposal from Snapshot</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="tally">
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">Tally Proposal</span>
                      <span className="text-xs text-muted-foreground">New on-chain proposal from Tally</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">Ending Soon Alert</span>
                      <span className="text-xs text-muted-foreground">Reminder for proposals ending soon</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={sendTestNotification} disabled={permission !== "granted"} className="w-full" size="lg">
              <Bell className="mr-2 h-4 w-4" />
              Send Test Notification
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Send to All Subscribers</CardTitle>
            <CardDescription>Send a test notification to everyone who has enabled notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={sendServerTestNotification}
              disabled={isSending}
              className="w-full"
              size="lg"
              variant="default"
            >
              <Bell className="mr-2 h-4 w-4" />
              {isSending ? "Sending..." : "Send Test to All Subscribers"}
            </Button>

            {serverStatus && <div className="rounded-lg bg-muted p-3 text-sm">{serverStatus}</div>}
          </CardContent>
        </Card>

        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">How to test:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Request Permission" if not already granted</li>
            <li>Select a notification type from the dropdown</li>
            <li>Click "Send Test Notification"</li>
            <li>The notification will appear in your system tray</li>
            <li>Click "View Proposal" or the notification to test the action</li>
            <li>Click "Send Test to All Subscribers" to send a notification to all enabled subscribers</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
