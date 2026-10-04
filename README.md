# CERA Code

CERA (Code Execution, Review and Assessment) is a React and Vite application for managing programming assignments, submissions, evaluation, analytics, and live labs. The repository contains the frontend and a separate Node.js/Express API scaffold using the official MongoDB Node.js driver.

## Requirements

- Node.js 18.18 or newer
- npm 9 or newer
- A MongoDB Atlas cluster (or another MongoDB deployment)

## Frontend setup

```bash
npm install
npm run dev
```

Vite prints the local frontend URL, normally `http://localhost:5173`.

To connect the frontend to the local API, create a root `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Without `VITE_API_BASE_URL`, sign-in continues to use the current in-memory development behavior. Password recovery requires the API and does not send email from the frontend.

## Backend setup

Install backend dependencies:

```bash
cd backend
npm install
```

Copy `backend/.env.example` to `backend/.env`, then set the actual Atlas URI and database name. Never commit `.env` or place database credentials in source files. Replace `<db_password>` with the Atlas database user's password; URL-encode reserved characters in the password. Confirm the database user's network access list allows your development IP in Atlas.

Start the backend from the repository root:

```bash
npm run backend:dev
```

The API listens on `http://localhost:3000` by default. The health endpoint `GET /api/health` verifies the MongoDB connection with a ping. The server exits with a configuration/connection error if MongoDB cannot be reached; it does not silently use an in-memory database.

If Node cannot resolve the Atlas SRV record in your environment, optionally set `MONGODB_DNS_SERVERS` to comma-separated DNS server IP addresses in `backend/.env`. Leave it unset when the system DNS resolver works.

To launch it directly from `backend/`, use `npm run dev`. Use `npm start` for a non-watch process.

## Backend structure

```text
backend/
	.env.example
	package.json
	src/
		app.js                    Express middleware and API mounting
		server.js                 Startup and graceful shutdown
		config/
			env.js                  Environment loading and validation
			database.js             MongoDB client and database lifecycle
		middleware/
			errorHandler.js         Centralized API errors
			notFound.js             JSON 404 response
		modules/
			health/
				health.controller.js  Database readiness response
				health.routes.js      Health route
		routes/
			index.js                Versioned API route registry
```

The backend uses Express, Helmet, CORS, dotenv, and the MongoDB Node.js driver. Feature-specific modules can be added under `src/modules` as the assignment, user, and evaluation data models and access rules are defined.

## Authentication and API status

Public account creation is disabled. Accounts are expected to be provisioned by an institution. The frontend recovery flow is prepared to call:

| Method | Endpoint | Request |
| --- | --- | --- |
| `POST` | `/api/auth/login` | `{ "email": "...", "password": "..." }` |
| `POST` | `/api/auth/forgot-password` | `{ "email": "..." }` |
| `POST` | `/api/auth/reset-password` | `{ "token": "...", "password": "..." }` |

These authentication endpoints are not implemented by the backend scaffold yet. They require institutional account provisioning, password hashing, session/token design, rate limiting, and a server-side email provider. Forgot-password must return a generic success response whether or not the address exists. Reset tokens must be random, single-use, time-limited, and validated only on the backend.

## Application routes

- Public frontend routes: `/login`, `/signin`, `/forgot-password`, `/reset-password`
- Faculty workspace: routes such as `/dashboard`, `/assignments`, `/submissions`, `/evaluation-queue`, `/analytics`, and `/live-lab`
- Student workspace: routes under `/student/*`
- Backend health: `GET /api/health`

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite frontend |
| `npm run build` | Build the frontend into `dist/public` |
| `npm run serve` | Preview the frontend production build |
| `npm run backend:dev` | Start the backend with Node watch mode |
| `npm run backend:start` | Start the backend without watch mode |
| `npm run backend:check` | Check backend JavaScript syntax |