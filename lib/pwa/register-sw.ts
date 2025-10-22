export async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js", {
        scope: "/",
      })

      // Check for updates periodically
      setInterval(() => {
        registration.update()
      }, 60000) // Check every minute

      return registration
    } catch (error) {
      throw error
    }
  } else {
    throw new Error("Service Workers are not supported in this browser")
  }
}

export async function unregisterServiceWorker() {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready
    await registration.unregister()
  }
}

export async function getServiceWorkerRegistration() {
  if ("serviceWorker" in navigator) {
    return await navigator.serviceWorker.ready
  }
  return null
}
