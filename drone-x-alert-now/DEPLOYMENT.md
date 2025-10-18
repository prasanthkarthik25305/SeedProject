# Deployment Guide

This guide explains how to deploy the DroneX Alert Now application: the Vite + React frontend and the optional Node/Express backend (server on port 4000).

## 1) Frontend (Vercel)

- Import the GitHub repo into Vercel.
- Project settings → Environment Variables (Production + Preview):
  - `VITE_SUPABASE_URL` = https://<project-ref>.supabase.co
  - `VITE_SUPABASE_ANON_KEY` = <anon-key>
  - `VITE_API_BASE_URL` = https://your-api.example.com (if you deploy a backend)
- Build & Output Settings:
  - Framework Preset: Other
  - Build Command: `npm run build`
  - Install Command: `npm ci`
  - Output Directory: `dist`
- Redeploy.

## 2) Backend (Render or Railway)

Choose one; both work well for a Node/Express service on port 4000.

### Render

- New → Web Service → Connect GitHub repo
- Root Directory: `server`
- Build Command: `npm ci`
- Start Command: `npm start`
- Environment → add variables:
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or `SUPABASE_SERVICE_ROLE_KEY` only if required server-side)
  - Any other keys your server uses
- Ensure your server listens on `process.env.PORT`.
- Note the Render URL (e.g., `https://your-api.onrender.com`).
- CORS: allow your Vercel domain.

### Railway

- New Project → Deploy from GitHub
- Root Directory: `server`
- Install: `npm ci`
- Start: `npm start`
- Add the same Environment Variables as above.
- Ensure the code listens on `process.env.PORT`.
- Note the Railway domain (e.g., `https://your-api.up.railway.app`).

## 3) Supabase Settings

- Auth → Providers: enable Google and set redirect to your site (e.g., `https://your-frontend.vercel.app/dashboard`).
- Storage → Bucket `chat-files` (public) for attachments.
- SQL → Apply repository migrations in `supabase/migrations/`.

## 4) CORS Checklist

- On the backend, allow origin `https://your-frontend.vercel.app` (and your dev origin `http://localhost:5173`).
- Allow methods: `GET, POST, PUT, DELETE, OPTIONS`.
- Allow headers: `Content-Type, Authorization`.
- If you use cookies, set `credentials: true` and configure proper SameSite.

## 5) Websocket Support

- Ensure the host supports WebSocket upgrades (Render/Railway do by default).
- Client connects with `wss://<api-domain>`.

## 6) Health Check

- Add an endpoint like `/health` in your server that returns 200.
- Validate after deploy: `curl https://your-api.onrender.com/health`.

## 7) Point Frontend to Backend

- In Vercel → Project Settings → Environment Variables:
  - `VITE_API_BASE_URL=https://your-api.onrender.com` (or Railway domain)
- Redeploy frontend.

## 8) Post-Deploy Tests

- Login via Google and Email/Password.
- Open Messages → send 1:1 and group messages; verify realtime and read ticks.
- Try attachments (image preview) in Direct Chat.
- Global Search in Inbox.
- Presence: open Dashboard in two browsers and confirm Online badge.

---

# Single-Click Local Run

Use the `scripts/run.sh` script to bootstrap both frontend and backend locally.

```
bash scripts/run.sh
```

It will install dependencies (root and `server/` if present), run the dev server on 5173 and your backend on 4000.
