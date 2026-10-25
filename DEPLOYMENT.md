# CERA Deployment Guide

## 1. Architecture

```
Browser
  └── Vercel (React + Vite, static)
        └── VITE_API_BASE_URL ──► Cloudflare Quick Tunnel (HTTPS)
                                        └── localhost:3000 (Express API, Windows laptop)
                                                ├── MongoDB Atlas (cloud)
                                                ├── Ollama (localhost:11434, Windows)
                                                └── Docker Desktop (Windows, code sandbox)
```

- The frontend is a static React SPA deployed to Vercel.
- The backend is a persistent Node.js/Express process running on your Lenovo LOQ laptop.
- Cloudflare Quick Tunnel exposes the backend over HTTPS without a paid plan or static IP.
- MongoDB Atlas stores all application data.
- Ollama runs locally on the laptop and is never exposed publicly.
- Docker Desktop runs sandboxed student code locally and is never exposed publicly.
- **The backend, Ollama, and Docker execution are unavailable if the laptop, backend process, or internet connection stops.**

---

## 2. Prerequisites (Windows 11)

- Node.js 18.18 or newer: https://nodejs.org
- npm 9 or newer (bundled with Node.js)
- Git: https://git-scm.com
- Docker Desktop for Windows: https://www.docker.com/products/docker-desktop
- Ollama for Windows: https://ollama.com/download
- Cloudflare CLI (`cloudflared`): https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
- A MongoDB Atlas account: https://www.mongodb.com/atlas

Verify installations:

```powershell
node --version        # >= 18.18
npm --version         # >= 9
docker --version
ollama --version
cloudflared --version
```

---

## 3. Environment Variables

### Backend — `backend/.env`

Copy `backend/.env.example` to `backend/.env` and fill in real values. Never commit `backend/.env`.

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | No | Set to `production` for production runs. Defaults to `development`. |
| `PORT` | No | Port the API listens on. Defaults to `3000`. |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins. Must include your Vercel URL in production. |
| `MONGODB_URI` | Yes | Full MongoDB Atlas connection string. Replace `<db_password>` with the real password. URL-encode special characters. |
| `MONGODB_DB_NAME` | No | Database name. Defaults to `cera`. |
| `JWT_SECRET` | Yes | Random secret, minimum 32 bytes. Generate with the command below. |
| `DOCKER_BIN` | No | Full path to `docker.exe` if Docker is not on `PATH`. |
| `OLLAMA_BASE_URL` | No | Ollama HTTP endpoint. Defaults to `http://127.0.0.1:11434`. |
| `OLLAMA_MODEL` | No | Model name. Defaults to `qwen2.5-coder:14b`. |
| `OLLAMA_TIMEOUT_MS` | No | Grading timeout in ms. Defaults to `300000` (5 min). Range: 30000–900000. |
| `OLLAMA_RETRY_LIMIT` | No | Transient retry count. Defaults to `1`. Range: 0–3. |
| `OLLAMA_RETRY_DELAY_MS` | No | Delay between retries in ms. Defaults to `3000`. Range: 500–30000. |
| `MONGODB_DNS_SERVERS` | No | Comma-separated DNS IPs if Node cannot resolve Atlas SRV records. |

Generate a JWT secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Production `CORS_ORIGINS` example (replace with your actual Vercel URL):

```
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,https://your-app.vercel.app
```

### Frontend — Vercel environment variables

Set in the Vercel project dashboard under Settings → Environment Variables.

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Your Cloudflare Quick Tunnel URL, e.g. `https://xxxx.trycloudflare.com`. No trailing slash. |

For local development, leave `VITE_API_BASE_URL` unset or empty. Vite's dev proxy forwards `/api` to `http://localhost:3000` automatically.

---

## 4. Local Frontend Startup

```powershell
# From the project root
npm install
npm run dev
```

Vite starts at `http://localhost:5173`. The `/api` proxy forwards to `http://localhost:3000`.

---

## 5. Local Backend Startup

```powershell
# From the project root
npm run backend:dev
```

Or from `backend/` directly:

```powershell
cd backend
npm install
npm run dev
```

The API starts at `http://localhost:3000`. Verify with:

```powershell
curl http://localhost:3000/api/health
```

Expected response: `{"status":"ok","database":"connected"}`

The server exits with a clear error message if `MONGODB_URI`, `JWT_SECRET`, or the MongoDB connection is invalid. It does not silently fall back to an in-memory database.

---

## 6. MongoDB Atlas Configuration

1. Create a free M0 cluster at https://cloud.mongodb.com.
2. Create a database user with read/write access to the `cera` database.
3. URL-encode any special characters in the password.
4. Copy the connection string into `backend/.env` as `MONGODB_URI`.
5. Under Network Access, add the IP address of your laptop (or `0.0.0.0/0` temporarily for testing — restrict this before any real use).
6. The backend creates all required collections and indexes at startup. No manual migration is needed.

**Narrowest practical network permission:** Add only your laptop's current public IP. Update it whenever your ISP assigns a new address. `0.0.0.0/0` is convenient but exposes the cluster to the internet — use it only for initial testing and remove it afterward.

---

## 7. Ollama Startup and Verification

```powershell
# Pull the model (one-time, ~2 GB)
ollama pull qwen2.5-coder:14b

# Verify the model is available
ollama list

# Start the Ollama service (runs in background after install)
ollama serve
```

Verify Ollama is reachable from the backend:

```powershell
curl http://127.0.0.1:11434/api/tags
```

The backend calls Ollama at `http://127.0.0.1:11434` by default. Ollama is never exposed through the Cloudflare tunnel — only the backend API is tunneled.

**Performance note:** AI evaluation with `qwen2.5-coder:14b` on a laptop CPU takes 2–10 minutes per submission depending on hardware. The default timeout is 5 minutes (`OLLAMA_TIMEOUT_MS=300000`). Use `qwen2.5-coder:3b` for faster (lower quality) results by setting `OLLAMA_MODEL=qwen2.5-coder:3b` in `backend/.env`.

---

## 8. Docker Verification

```powershell
# Confirm Docker Desktop is running
docker info

# Pull required runtime images (one-time, several GB total)
docker pull python:3.12-alpine
docker pull node:22-alpine
docker pull eclipse-temurin:21-jdk
docker pull gcc:14

# Verify images are present
docker images
```

If `docker` is not on `PATH`, set `DOCKER_BIN` in `backend/.env`:

```
DOCKER_BIN=C:\Program Files\Docker\Docker\resources\bin\docker.exe
```

Code execution returns HTTP 503 if Docker or a required image is unavailable. No code runs on the API host directly.

---

## 9. Vercel Deployment

### Build settings (set in Vercel dashboard or detected automatically)

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `.` (project root) |
| Build Command | `npm run build` |
| Output Directory | `dist/public` |
| Install Command | `npm install` |

### Environment variables (Vercel dashboard → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | Your Cloudflare Quick Tunnel URL (see section 11) |

### SPA routing

`vercel.json` at the project root contains a rewrite rule that serves `index.html` for all routes. This enables direct navigation and page refresh for all React Router routes (`/dashboard`, `/student/assignments`, etc.).

### Deploy steps

1. Push the repository to GitHub (or connect Vercel to your repo directly).
2. Import the project in the Vercel dashboard.
3. Set the build settings above.
4. Add `VITE_API_BASE_URL` in environment variables.
5. Deploy. Vercel builds the frontend and serves it from its CDN.

---

## 10. Cloudflare Quick Tunnel

Quick Tunnel creates a temporary HTTPS URL that forwards to your local backend. No account or paid plan is required.

### Start the tunnel

```powershell
# In a separate terminal, after starting the backend
cloudflared tunnel --url http://localhost:3000
```

Cloudflare prints a URL like `https://random-words.trycloudflare.com`. This is your backend's public address.

### Important limitations

- The tunnel URL changes every time you restart `cloudflared`.
- The backend is unreachable if the laptop sleeps, the backend process stops, or the internet connection drops.
- Quick Tunnel URLs are temporary and not suitable for a permanent production deployment.

---

## 11. Production API URL Configuration

Every time the Cloudflare Quick Tunnel URL changes, update `VITE_API_BASE_URL` in Vercel:

1. Start the backend: `npm run backend:dev`
2. Start the tunnel: `cloudflared tunnel --url http://localhost:3000`
3. Copy the printed URL (e.g. `https://xxxx.trycloudflare.com`).
4. In the Vercel dashboard: Settings → Environment Variables → edit `VITE_API_BASE_URL`.
5. Redeploy the Vercel project (or trigger a redeploy from the dashboard).

Alternatively, create a `.env.local` file at the project root for local testing against a specific tunnel URL:

```env
VITE_API_BASE_URL=https://xxxx.trycloudflare.com
```

This file is excluded from Git by `.gitignore`.

---

## 12. CORS Configuration

The backend reads allowed origins from `CORS_ORIGINS` in `backend/.env`. Add your Vercel URL:

```
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,https://your-app.vercel.app
```

Restart the backend after changing `backend/.env`. The backend does not use a wildcard origin in production — only the listed origins are allowed.

---

## 13. Deployment Smoke-Test Checklist

Run these checks after every deployment or tunnel restart.

- [ ] `GET https://<tunnel>.trycloudflare.com/api/health` returns `{"status":"ok","database":"connected"}`
- [ ] Vercel frontend loads at `https://your-app.vercel.app`
- [ ] `/login` page renders correctly
- [ ] Faculty login succeeds and redirects to `/dashboard`
- [ ] Student login succeeds and redirects to `/student/dashboard`
- [ ] Direct navigation to `/dashboard` (faculty) works without 404
- [ ] Direct navigation to `/student/assignments` works without 404
- [ ] Page refresh on any route works without 404
- [ ] Faculty can create an assignment
- [ ] Student can view published assignments
- [ ] Student can submit code
- [ ] Code execution returns results (requires Docker running on laptop)
- [ ] Faculty evaluation queue shows submitted work
- [ ] AI auto-evaluate triggers and returns a result (requires Ollama running)
- [ ] Notifications appear after relevant events
- [ ] Light/dark theme toggle persists across page refresh
- [ ] Logout clears the session and redirects to `/login`

---

## 14. Common Errors and Troubleshooting

### Backend fails to start: `MONGODB_URI is required`
`backend/.env` is missing or `MONGODB_URI` is not set. Copy `backend/.env.example` to `backend/.env` and fill in the Atlas connection string.

### Backend fails to start: `Replace the MONGODB_URI password placeholder`
The connection string still contains `<db_password>`. Replace it with the real Atlas database user password.

### Backend fails to start: `JWT_SECRET is required and must be at least 32 bytes`
`JWT_SECRET` is missing or too short. Generate one with:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### `GET /api/health` returns `{"database":"disconnected"}`
MongoDB Atlas cannot be reached. Check:
- The Atlas cluster is running (not paused).
- Your laptop's IP is in the Atlas Network Access list.
- `MONGODB_URI` is correct and the password is URL-encoded.

### Frontend shows "The API returned an unexpected response" or network errors
- Confirm the backend is running: `curl http://localhost:3000/api/health`
- Confirm the tunnel is running and the URL matches `VITE_API_BASE_URL` in Vercel.
- Redeploy Vercel after updating `VITE_API_BASE_URL`.

### CORS error in browser console
The Vercel frontend origin is not in `CORS_ORIGINS`. Add `https://your-app.vercel.app` to `CORS_ORIGINS` in `backend/.env` and restart the backend.

### Code execution returns 503
Docker Desktop is not running, or the required runtime image has not been pulled. Start Docker Desktop and run `docker pull python:3.12-alpine` (and the other images listed in section 8).

### AI evaluation times out or returns 504
Ollama is not running or the model is not loaded. Run `ollama serve` and `ollama list` to verify. Consider using `qwen2.5-coder:3b` for faster responses.

### Direct navigation returns 404 on Vercel
`vercel.json` is missing or not deployed. Confirm `vercel.json` exists at the project root and redeploy.

### Tunnel URL changed, frontend cannot reach backend
Update `VITE_API_BASE_URL` in Vercel environment variables and redeploy (see section 11).

---

## 15. Security Limitations

The following issues exist in the current architecture and must be addressed before any public or institutional use:

1. **No rate limiting on `/api/auth/login`** — The login endpoint has no brute-force protection. An attacker can attempt unlimited password guesses. Add a rate-limiting middleware (e.g. `express-rate-limit`) to `/api/auth/login` before exposing the backend publicly.

2. **Cloudflare Quick Tunnel URL is temporary** — The tunnel URL changes on every restart. This is not suitable for a stable production deployment. For a permanent setup, use a named Cloudflare Tunnel with a custom domain (requires a free Cloudflare account and a domain).

3. **MongoDB Atlas network access** — If `0.0.0.0/0` was used for initial testing, restrict it to your laptop's IP before real use.

4. **Single point of failure** — The entire backend, AI evaluation, and code execution depend on one laptop being online. There is no redundancy or failover.

5. **No HTTPS for the backend locally** — The backend listens on plain HTTP. Cloudflare Quick Tunnel provides HTTPS termination at the edge, so traffic between the browser and Cloudflare is encrypted. Traffic between Cloudflare and your laptop is local and unencrypted.

6. **JWT secret in `.env`** — The `JWT_SECRET` in `backend/.env` must be kept secret. Rotating it invalidates all existing sessions. Back it up securely.

7. **Docker image versions** — Runtime images (`python:3.12-alpine`, `node:22-alpine`, etc.) should be periodically updated to receive security patches. Pin to specific digest hashes for reproducibility in a production environment.

8. **No submission-level concurrent execution limit** — Multiple simultaneous code-run requests will each spawn Docker containers. Under heavy load this could exhaust system resources. Monitor Docker resource usage.
