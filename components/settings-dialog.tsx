"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Download, Bell } from "lucide-react"

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l-.15-.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

interface SettingsDialogProps {
  delegateId: string | null
}

export function SettingsDialog({ delegateId }: SettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [preferences, setPreferences] = useState({
    notify_discourse: true,
    notify_snapshot: true,
    notify_tally: true,
    notify_active_only: false,
  })
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && delegateId) {
      loadDelegateData()
    }
  }, [open, delegateId])

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
      return
    }

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    if (iOS) {
      setIsInstallable(true)
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
    }
  }, [])

  const loadDelegateData = async () => {
    if (!delegateId) return

    try {
      const response = await fetch(`/api/delegates/${delegateId}`)
      const data = await response.json()

      if (data.success && data.delegate) {
        setDisplayName(data.delegate.display_name || "")
        setEmail(data.delegate.email || "")

        if (data.delegate.notification_preferences?.[0]) {
          setPreferences({
            notify_discourse: data.delegate.notification_preferences[0].notify_discourse,
            notify_snapshot: data.delegate.notification_preferences[0].notify_snapshot,
            notify_tally: data.delegate.notification_preferences[0].notify_tally,
            notify_active_only: data.delegate.notification_preferences[0].notify_active_only,
          })
        }
      }
    } catch (error) {
      console.error("[v0] Error loading delegate data:", error)
    }
  }

  const handleInstall = async () => {
    if (isInstalled) {
      toast({
        title: "Already Installed",
        description: "DAOVote is already installed on your device",
      })
      return
    }

    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === "accepted") {
        toast({
          title: "App installed",
          description: "DAOVote has been added to your home screen",
        })
        setIsInstallable(false)
        setIsInstalled(true)
      }

      setDeferredPrompt(null)
    } else if (isIOS) {
      toast({
        title: "Install on iOS",
        description: "Tap the Share button in Safari, then select 'Add to Home Screen'",
        duration: 5000,
      })
    } else {
      toast({
        title: "Install App",
        description: "Use your browser menu to install this app to your home screen",
        duration: 5000,
      })
    }
  }

  const handleSendTestNotification = async () => {
    setIsSendingTest(true)

    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Test notification sent",
          description: `Successfully sent to ${data.sent} subscribers${data.failed > 0 ? ` (${data.failed} failed)` : ""}`,
        })
      } else {
        throw new Error(data.error || "Failed to send test notification")
      }
    } catch (error) {
      console.error("[v0] Error sending test notification:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send test notification",
        variant: "destructive",
      })
    } finally {
      setIsSendingTest(false)
    }
  }

  const handleSave = async () => {
    if (!delegateId) {
      toast({
        title: "Error",
        description: "Please subscribe to notifications first",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const profileResponse = await fetch(`/api/delegates/${delegateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
        }),
      })

      const profileData = await profileResponse.json()

      if (!profileData.success) {
        throw new Error(profileData.error)
      }

      const preferencesResponse = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delegateId,
          preferences,
        }),
      })

      const preferencesData = await preferencesResponse.json()

      if (!preferencesData.success) {
        throw new Error(preferencesData.error)
      }

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully",
      })

      setOpen(false)
    } catch (error) {
      console.error("[v0] Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SettingsIcon />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Notification Settings</DialogTitle>
          <DialogDescription>Manage your notification preferences and profile information</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Profile Information</h3>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Enter your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Notification Sources</h3>
            <p className="text-sm text-muted-foreground">Choose which platforms to receive notifications from</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-snapshot">Snapshot</Label>
                  <p className="text-sm text-muted-foreground">Get notified about Snapshot proposals</p>
                </div>
                <Switch
                  id="notify-snapshot"
                  checked={preferences.notify_snapshot}
                  onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, notify_snapshot: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-tally">Tally</Label>
                  <p className="text-sm text-muted-foreground">Get notified about Tally proposals</p>
                </div>
                <Switch
                  id="notify-tally"
                  checked={preferences.notify_tally}
                  onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, notify_tally: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-discourse">Discourse</Label>
                  <p className="text-sm text-muted-foreground">Get notified about Discourse topics</p>
                </div>
                <Switch
                  id="notify-discourse"
                  checked={preferences.notify_discourse}
                  onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, notify_discourse: checked }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Ending Soon Alert</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm text-muted-foreground">Reminder for proposals ending soon</p>
              </div>
              <Switch
                id="notify-active-only"
                checked={preferences.notify_active_only}
                onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, notify_active_only: checked }))}
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-medium">Install App</h3>
            <p className="text-sm text-muted-foreground">
              {isInstalled
                ? "DAOVote is installed on your device"
                : "Install DAOVote on your device for quick access and offline support"}
            </p>
            <Button onClick={handleInstall} className="w-full bg-transparent" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {isInstalled ? "Already Installed" : "Install App"}
            </Button>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-medium">Test Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Send a test notification to all users who have enabled notifications
            </p>
            <Button
              onClick={handleSendTestNotification}
              disabled={isSendingTest}
              className="w-full bg-transparent"
              variant="outline"
            >
              <Bell className="mr-2 h-4 w-4" />
              {isSendingTest ? "Sending..." : "Send Test to All Users"}
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
