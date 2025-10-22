# Arbitrum Governance PWA

A Progressive Web App that sends push notifications to Arbitrum delegates when new proposals are posted on Discourse, Snapshot, and Tally.

## Features

- 📱 Progressive Web App with offline support
- 🔔 Push notifications for new governance proposals
- 📊 Real-time proposal tracking from multiple sources
- 🎯 Customizable notification preferences
- 🌙 Dark mode interface
- 📈 Voting statistics and proposal status

## Setup

### 1. Environment Variables

Create a `.env.local` file with the following variables:

\`\`\`env
# Supabase (already configured via integration)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# VAPID Keys for Web Push (generate using: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:your-email@example.com

# App URL
NEXT_PUBLIC_APP_URL=https://your-app-url.vercel.app

# Optional: Tally API Key (for higher rate limits)
TALLY_API_KEY=your_tally_api_key
\`\`\`

### 2. Generate VAPID Keys

Run the following command to generate VAPID keys for web push notifications:

\`\`\`bash
npx web-push generate-vapid-keys
\`\`\`

Add the generated keys to your environment variables.

### 3. Database Setup

The database schema is automatically created when you run the SQL scripts in the `scripts` folder. The Supabase integration handles this automatically.

### 4. Deploy to Vercel

The app includes a `vercel.json` file that configures a cron job to sync proposals and send notifications every 6 hours.

\`\`\`bash
vercel deploy
\`\`\`

## Usage

### Subscribe to Notifications

1. Visit the app in your browser
2. Click the "Subscribe" button in the header
3. Grant notification permissions when prompted
4. You'll now receive push notifications for new proposals

### Filter Proposals

Use the sidebar filters to view proposals by:
- Source (Snapshot, Tally, Discourse)
- Status (Active, Pending, Closed, Completed)

### Manual Sync

Click the "Refresh" button in the header to manually sync proposals from all sources.

## API Endpoints

- `POST /api/proposals/sync` - Sync proposals from all sources
- `GET /api/proposals` - Get all proposals (with optional filters)
- `POST /api/delegates/subscribe` - Subscribe to push notifications
- `POST /api/delegates/unsubscribe` - Unsubscribe from push notifications
- `POST /api/notifications/send` - Send notifications for a specific proposal
- `POST /api/notifications/check-new` - Check for new proposals and send notifications
- `GET /api/cron/sync-and-notify` - Cron job endpoint (called every 6 hours)

## Development

\`\`\`bash
npm install
npm run dev
\`\`\`

Visit `http://localhost:3000` to see the app.

## Technologies

- Next.js 15 (App Router)
- Supabase (Database & Auth)
- Web Push API
- Service Workers
- Tailwind CSS
- shadcn/ui components

## License

MIT
