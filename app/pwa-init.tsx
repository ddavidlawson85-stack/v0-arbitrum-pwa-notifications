"use client"

import { useEffect } from "react"
import { registerServiceWorker } from "@/lib/pwa/register-sw"

export function PWAInit() {
  useEffect(() => {
    const isProduction = process.env.NODE_ENV === "production"

    if (!isProduction) {
      console.log("[v0] Service worker registration skipped in development/preview environment")
      console.log("[v0] Push notifications will only work in production deployment")
      return
    }

    registerServiceWorker()
      .then(() => console.log("[v0] Service worker registered successfully"))
      .catch((err) => {
        console.error("[v0] Service worker registration failed:", err)
        if (err instanceof Error) {
          console.error("[v0] Error details:", err.message)
        }
      })

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "CLEAR_OLD_DISMISSALS") {
          const storedVersion = localStorage.getItem("pwa-cache-version")
          const newVersion = event.data.cacheVersion

          if (storedVersion !== newVersion) {
            console.log("[v0] Cache version changed, clearing old prompt dismissals")
            localStorage.removeItem("install-prompt-dismissed-until")
            localStorage.removeItem("notification-prompt-dismissed-until")
            localStorage.removeItem("install-prompt-dismissed")
            localStorage.removeItem("notification-prompt-shown")
            localStorage.setItem("pwa-cache-version", newVersion)
          }
        }
      })
    }
  }, [])

  return null
}
