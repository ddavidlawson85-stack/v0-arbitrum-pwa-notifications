# Push Notifications Setup Instructions

This guide will help you set up push notifications for the Arbitrum PWA.

## Step 1: Generate VAPID Keys

Run the following command to generate VAPID keys:

\`\`\`bash
node scripts/generate-vapid-keys.js
\`\`\`

This will output something like:

\`\`\`
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BKxT...
VAPID_PRIVATE_KEY=abc123...
\`\`\`

## Step 2: Add Environment Variables

Add the following environment variables to your Vercel project:

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add these variables:

\`\`\`
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:your-email@example.com
NEXT_PUBLIC_APP_URL=https://your-app-url.vercel.app
\`\`\`

**Important:**
- Replace `your-email@example.com` with your actual contact email
- Replace `your-app-url.vercel.app` with your actual Vercel app URL
- Keep `VAPID_PRIVATE_KEY` secret - never commit it to git!

## Step 3: Run Database Migration Scripts

The database tables need to be created in your Supabase database. You can run these scripts directly from the v0 interface:

1. Click on the "Scripts" section in the v0 sidebar
2. Run the following scripts in order:
   - `001_create_delegates_table.sql`
   - `002_create_proposals_table.sql`
   - `003_create_notification_preferences.sql`

Alternatively, you can run them manually in the Supabase SQL editor.

## Step 4: Verify Cron Job Setup

The cron job is already configured in `vercel.json` to run every 5 minutes. It will:
- Sync proposals from Discourse, Snapshot, and Tally
- Check for new proposals
- Send push notifications to subscribed users

The cron job will automatically start working once you deploy to Vercel.

## Step 5: Test Push Notifications

1. Deploy your app to Vercel
2. Open the app in a browser (Chrome, Edge, or Firefox recommended)
3. Install the PWA (Add to Home Screen)
4. Open the installed PWA
5. You should see a notification prompt after 2 seconds
6. Click "Enable Notifications" to subscribe
7. Wait for the cron job to run (every 5 minutes) or manually trigger it by visiting:
   `https://your-app-url.vercel.app/api/cron/sync-and-notify`

## Troubleshooting

### Notifications not working?

1. **Check browser support**: Push notifications work in Chrome, Edge, Firefox, and Safari 16.4+
2. **Check permissions**: Make sure you granted notification permissions
3. **Check environment variables**: Verify all VAPID keys are set correctly
4. **Check database**: Ensure all tables are created and push_subscriptions table has entries
5. **Check logs**: Look at Vercel function logs for any errors

### Testing locally

To test locally, you need to:
1. Use HTTPS (or localhost)
2. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000` in your `.env.local`
3. Manually trigger the cron job by visiting `http://localhost:3000/api/cron/sync-and-notify`

## How It Works

1. **User subscribes**: When a user enables notifications, their push subscription is saved to the `push_subscriptions` table
2. **Cron job runs**: Every 5 minutes, the cron job syncs proposals and checks for new ones
3. **Notifications sent**: If new proposals are found, push notifications are sent to all subscribed users
4. **User receives**: The service worker receives the push event and displays a notification

## Next Steps

- Implement user authentication to associate subscriptions with specific users
- Add notification preferences UI to let users customize which types of proposals they want to be notified about
- Add unsubscribe functionality in the settings
