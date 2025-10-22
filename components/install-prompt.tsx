"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)

const DownloadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
)

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const dismissedUntil = localStorage.getItem("install-prompt-dismissed-until")
    if (dismissedUntil) {
      const dismissedTime = Number.parseInt(dismissedUntil, 10)
      const now = Date.now()
      // Show prompt again after 7 days
      if (now < dismissedTime) {
        return
      } else {
        // Clear expired dismissal
        localStorage.removeItem("install-prompt-dismissed-until")
      }
    }

    if (window.matchMedia("(display-mode: standalone)").matches) {
      return
    }

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)

    if (iOS) {
      setShowPrompt(true)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log("[v0] Install prompt outcome:", outcome)
      setDeferredPrompt(null)
    }

    setShowPrompt(false)
    const sevenDaysFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000
    localStorage.setItem("install-prompt-dismissed-until", sevenDaysFromNow.toString())
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    const sevenDaysFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000
    localStorage.setItem("install-prompt-dismissed-until", sevenDaysFromNow.toString())
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-300 md:left-auto md:right-4 md:max-w-md">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <DownloadIcon />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground mb-3">
              {isIOS
                ? "Tap Share → Add to Home Screen to install DAOVote."
                : "Install DAOVote to your home screen for faster access."}
            </p>

            {!isIOS && (
              <Button
                onClick={handleInstall}
                size="sm"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-9"
              >
                Add to Home Screen
              </Button>
            )}
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
