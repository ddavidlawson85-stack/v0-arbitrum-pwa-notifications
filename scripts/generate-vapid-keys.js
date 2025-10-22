import webpush from "web-push"

console.log("Generating VAPID keys for push notifications...\n")

const vapidKeys = webpush.generateVAPIDKeys()

console.log("✅ VAPID keys generated successfully!\n")
console.log("Add these to your environment variables:\n")
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + vapidKeys.publicKey)
console.log("VAPID_PRIVATE_KEY=" + vapidKeys.privateKey)
console.log("\nVAPID_SUBJECT=mailto:your-email@example.com")
console.log("NEXT_PUBLIC_APP_URL=https://your-app-url.vercel.app")
console.log("\n⚠️  Keep the VAPID_PRIVATE_KEY secret - never commit it to git!")
console.log("⚠️  Replace the VAPID_SUBJECT email with your actual contact email")
console.log("⚠️  Replace NEXT_PUBLIC_APP_URL with your actual app URL")
