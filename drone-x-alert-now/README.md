## DroneX Alert Now

Modern React + Supabase app for emergency contacts, verification, 1:1 and group chats, realtime presence, and media sharing.

Key components:

- `src/components/Inbox.tsx` — unified Messages inbox with Contacts, Groups, Search tabs.
- `src/components/DirectChat.tsx` — WhatsApp‑like 1:1 chat, typing, read ticks, attachments, per‑chat search.
- `src/components/EmergencyGroupChat.tsx` — group chat with media, realtime, settings menu.
- `src/pages/Dashboard.tsx` — main app shell; tracks app‑wide presence.
- `src/pages/Auth.tsx` — email/password + Google OAuth.

Supabase is used for Auth, Database, Storage, and Realtime.

---

## Prerequisites

- Node.js 18+ and npm 9+
- Supabase project with the provided migrations applied
- A storage bucket named `chat-files` (public) for attachments

Optional but recommended:
- Render or Railway account for backend API hosting
- Vercel account for frontend hosting

---

## Environment Variables

Create `.env` at repo root (used by Vite):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

# Optional: direct API base if you host your own backend (server/)
VITE_API_BASE_URL=https://your-api.example.com
```

Vercel frontend will use `NEXT_PUBLIC_…` equivalents automatically if you mirror these (Vite reads `import.meta.env.VITE_*`).

---

## Install & Run (Local)

```sh
git clone <YOUR_GIT_URL>
cd drone-x-alert-now

# Frontend deps
npm ci

# If you have a backend at server/ (port 4000), install there too
(cd server && npm ci) || true

# Start frontend
npm run dev

# In another terminal, start backend (if present)
npm run dev -w server 2>/dev/null || (cd server && npm start)
```

Open: http://localhost:5173

---

## Supabase Setup (Quick)

1. Create project → copy Project URL and anon key to `.env`.
2. Apply migrations in `supabase/migrations/` (via Supabase SQL editor or CLI).
3. Create Storage bucket `chat-files` (public)
   - Settings → Storage → New bucket → `chat-files` → Public
4. Auth → Providers → enable Google, add Client ID/Secret, and allowed redirect (Site URL + `/dashboard`).

Realtime presence and channel features require Realtime to be enabled (default is on).

---

## Features & Notes

- 1:1 chat: realtime inserts/updates, read receipts, attachments via `chat-files` public URLs.
- Group chat: realtime messages, basic settings (rename, add member, leave), delivery ticks.
- Presence:
  - App‑wide: `presence-app` channel tracked in `Dashboard.tsx`.
  - DM‑scoped: `presence-dm-<sorted uid>` in `DirectChat.tsx`.
- Global search (Inbox Search tab) across direct and group messages you can access.

### Additional Capabilities

- **Live streaming**: `RealtimeDroneStream` component for admin‑controlled video feeds with AI detection overlays.
- **AI Assistant chatbot**: guides users, suggests safe places, and provides navigation hints; entry: `AI Assistant` button in `Dashboard` navbar.
- **Maps & navigation**: `LiveMap` and `GoogleMap` components visualize locations and routes.
- **Voice assistant**: `VoiceAssistant` component to read information and support basic voice commands.
- **Rescue team dashboards**: dedicated views (`RescueTeam`, `RescueTeamAuth`, admin controls) to receive alerts and coordinate responses.
- **Emergency calling shortcuts**: quick‑access UI to dial emergency numbers from within the app.

---

## Build

```sh
npm run build
npm run preview
```

---

## Deployment

See `DEPLOYMENT.md` for full step‑by‑step. Summary:

- Frontend (Vercel)
  - Import GitHub repo → set env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL` (if any) → Deploy.
  - Verify CORS rules in your backend allow your Vercel domain.

- Backend (server on port 4000)
  - Render or Railway → root dir `server/` → `npm ci` → start `npm start` and listen on `process.env.PORT`.
  - Set env vars (Supabase keys, any secrets). Use `wss://` for websockets clients.

---

## One‑click local run

Use `scripts/run.sh` to install and start both frontend and backend (if present):

```sh
bash scripts/run.sh
```

This script attempts to install dependencies and launch both processes, opening the site in your browser.

---

## Troubleshooting

- Online badge not updating: the peer must be active in the app (tracked in `presence-app`) or in the same DM (DM presence). Give it 1–2 seconds after refresh.
- Attachments require `chat-files` storage bucket and public URLs enabled.
- 400 error querying profiles by email: use the provided RPC `find_user_id_by_email(p_email text)` and ensure Google provider + profile backfill SQL has been run (see migrations and notes in code).
