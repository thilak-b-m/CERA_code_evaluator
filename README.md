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

During local development, Vite automatically forwards `/api` requests to `http://localhost:3000`. Start the backend with `npm run backend:dev` and the frontend with `npm run dev` in separate terminals. To use a backend at another URL, create a root `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Alternatively, change the Vite proxy target using `API_PROXY_TARGET`. For a deployed frontend, configure `VITE_API_BASE_URL` or route `/api` to the backend in the web server.

## Backend setup

Install backend dependencies:

```bash
cd backend
npm install
```

Copy `backend/.env.example` to `backend/.env`, then set the actual Atlas URI and database name. To start the API and enable login, also configure a cryptographically random `JWT_SECRET` of at least 32 bytes. Never commit `.env` or place credentials in source files. Replace `<db_password>` with the Atlas database user's password; URL-encode reserved characters in the password. Confirm the database user's network access list allows your development IP in Atlas.

Start the backend from the repository root:

```bash
npm run backend:dev
```

The API listens on `http://localhost:3000` by default. The health endpoint `GET /api/health` verifies the MongoDB connection with a ping. The server exits with a configuration/connection error if MongoDB cannot be reached; it does not silently use an in-memory database.

If Node cannot resolve the Atlas SRV record in your environment, optionally set `MONGODB_DNS_SERVERS` to comma-separated DNS server IP addresses in `backend/.env`. Leave it unset when the system DNS resolver works.

Docker is optional for assignment management and required only for isolated code execution. Windows setup instructions and runner image requirements are in [docker.md](./docker.md).

## Local AI evaluation

From the faculty evaluation queue, **Auto-evaluate all** grades and publishes every queued submission in sequence. Ollama considers the assignment description, optional evaluation conditions/complexity expectations, and submitted source code to produce marks and feedback. For manual evaluation, faculty enter the score and their own feedback; publishing also generates separate AI feedback, which students see with the faculty result. AI grading is advisory and does not execute submitted code or replace test-case checks. Use the individual review screen to manually edit and publish an evaluation.

Install/start Ollama and ensure the configured model is available:

```powershell
ollama pull qwen2.5-coder:3b
ollama list
```

The backend calls Ollama's local HTTP API at `http://127.0.0.1:11434` by default, so no Ollama executable path is needed. Override `OLLAMA_BASE_URL` and `OLLAMA_MODEL` in `backend/.env` if using a different endpoint or model, then restart the backend. If the backend itself runs in a container, use a host-reachable URL such as `http://host.docker.internal:11434` instead of the container's own `127.0.0.1`.

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
			auth/
				auth.controller.js    Login and current-user endpoint
				auth.middleware.js    JWT authentication and faculty authorization
				auth.routes.js        Authentication endpoints
				cli-input.js          Interactive prompts with hidden password input
				auth.service.js       Accounts, departments, password hashing, and tokens
				create-user.js       Faculty account provisioning
				set-password.js      Administrator password recovery
			students/
				students.schema.js    Student input validation and document shape
				students.service.js   Student enrollment, indexes, and department roster
				students.controller.js Department-scoped student roster
				students.routes.js    Faculty-only student endpoints
			assignments/
				assignments.schema.js Assignment and test-case validation
				assignments.service.js Assignment ownership, persistence, and visibility
				assignments.controller.js Assignment and test-case API handlers
				assignments.routes.js Assignment and test-case endpoints
			submissions/
				submissions.schema.js Submission input validation
				submissions.service.js Submission storage and ownership checks
				plagiarism.service.js Same-assignment source similarity analysis
				execution.worker.js Docker-isolated language runtimes
				submissions.controller.js Submission API handlers
				submissions.routes.js Student and faculty submission endpoints
			evaluations/
				evaluations.schema.js Score, feedback, and publication validation
				evaluations.service.js Faculty-scoped evaluation persistence
				evaluations.controller.js Evaluation API handlers
				evaluations.routes.js Faculty evaluation endpoints
			analytics/
				analytics.schema.js Analytics period validation
				analytics.service.js Faculty-scoped submission and evaluation aggregates
				analytics.controller.js Analytics API handler
				analytics.routes.js Faculty analytics endpoint
			live-lab/
				live-lab.service.js MongoDB-backed student presence and active sessions
				live-lab.controller.js Student heartbeat and faculty session handlers
				live-lab.routes.js Role-scoped live lab API
			secure-assessments/
				secure-assessments.service.js Server-owned assessment attempts, deadlines, and activity history
			notifications/
				notifications.schema.js Notification ID validation
				notifications.service.js Role-scoped activity notifications and durable read state
				notifications.controller.js Notification API handlers
				notifications.routes.js Authenticated notification endpoints
			reports/
				reports.schema.js Report section and format validation
				reports.service.js Faculty-scoped report data, templates, and export history
				reports.controller.js Report API handlers
				reports.routes.js Faculty report endpoints
		routes/
			index.js                Versioned API route registry
```

The backend uses Express, Helmet, CORS, dotenv, and the MongoDB Node.js driver. API startup creates indexes for `users`, `students`, `assignments`, submissions, evaluations, assignment test cases, and live-lab presence. Assignments belong to their creating faculty member; student APIs expose only published assignments and public test cases. Faculty APIs retain access to their own drafts and hidden cases. Passwords are hashed with scrypt and never stored as plaintext. Existing `password_resets` data is not used by the new flow.

## Authentication and API status

Public account creation is disabled. An institution administrator provisions faculty from a terminal on a machine that can connect to MongoDB:

1. Configure `backend/.env` with the MongoDB connection string and database name.
2. From the repository root, run `npm run user:create`.
3. At the prompts, enter the faculty member's name, institutional email, department or branch, and password. The password and confirmation are entered without echoing them.

The institution enters the faculty member's password while creating the faculty account. Faculty add students from the **Students** page and enter the student's password there; the server assigns that student to the faculty member's department. Faculty can only list students in their own department. There is no public registration endpoint or email integration. If a user forgets their password, an administrator can set a new one interactively with `npm run user:password`; the password is hidden while typed and existing sessions are invalidated. Set a random `JWT_SECRET` of at least 32 bytes in `backend/.env` before starting the API with `npm run backend:dev`.

Run `npm --prefix backend test` to exercise faculty and student account creation, department scoping, login, JWT validation, and password validation using an isolated in-memory database.

| Method | Endpoint | Request |
| --- | --- | --- |
| `POST` | `/api/auth/login` | `{ "email": "...", "password": "...", "remember": true }` |
| `GET` | `/api/students` | Faculty bearer token; returns students in that faculty member's department |
| `GET` | `/api/students/:usn` | Faculty bearer token; return a department-scoped student record with assignments and evaluation status |
| `GET` | `/api/students/me` | Student bearer token; returns the authenticated student's stored enrollment details |
| `PATCH` | `/api/students/me` | Student bearer token; updates profile name, email, bio, skills, GitHub, and LinkedIn |
| `PATCH` | `/api/auth/me` | Authenticated faculty; updates name, email, bio, skills, GitHub, and LinkedIn |
| `GET` | `/api/auth/preferences/theme` | Authenticated user; retrieve the account's saved light/dark preference |
| `PUT` | `/api/auth/preferences/theme` | Authenticated user; save a light or dark theme preference |
| `POST` | `/api/students` | Faculty bearer token; `{ "name": "...", "email": "...", "password": "...", "usn": "...", "year": 1 }` |
| `GET` | `/api/assignments` | Faculty token: own non-archived assignments; student token: published assignments |
| `POST` | `/api/assignments` | Faculty token; create an assignment with title, course, description, due date, points, and optional languages/status |
| `GET` | `/api/assignments/:id` | Faculty owner or student for published assignments |
| `PATCH` | `/api/assignments/:id` | Faculty owner; update assignment fields |
| `DELETE` | `/api/assignments/:id` | Faculty owner; archive assignment |
| `POST` | `/api/assignments/:id/restore` | Faculty owner; restore an archived assignment |
| `GET` | `/api/assignments/:id/test-cases` | Faculty owner gets all cases; students get public cases only |
| `POST` | `/api/assignments/:id/test-cases` | Faculty owner; add a case with `inputProfile`, exact `input` stdin text, exact `expectedOutput` stdout text, `visibility`, and `weight` |
| `PATCH` | `/api/assignments/:id/test-cases/:testCaseId` | Faculty owner; update a test case |
| `DELETE` | `/api/assignments/:id/test-cases/:testCaseId` | Faculty owner; delete a test case |
| `POST` | `/api/submissions` | Student token; persist submitted source code for a published assignment |
| `GET` | `/api/submissions/me` | Student token; list only that student's submissions |
| `GET` | `/api/submissions/:id` | Student token; retrieve only that student's submission |
| `GET` | `/api/submissions/faculty?assignmentId=:id` | Faculty token; list submissions for assignments owned by that faculty member |
| `GET` | `/api/submissions/faculty/:id` | Faculty token; retrieve a submission for an assignment owned by that faculty member |
| `POST` | `/api/submissions/run` | Student token; execute up to 20 public test cases in isolated Docker containers |
| `GET` | `/api/submissions/plagiarism` | Faculty token; report possible source-code overlaps between same-assignment submissions |
| `GET` | `/api/submissions/plagiarism/:id` | Faculty token; retrieve code comparisons for one submission |
| `GET` | `/api/evaluations/:submissionId` | Faculty token; retrieve that faculty member's saved draft or published evaluation |
| `PUT` | `/api/evaluations/:submissionId` | Faculty token; save `{ "score": 8, "feedback": "...", "status": "draft" }` or publish with `"status": "published"`; score cannot exceed assignment points |
| `POST` | `/api/evaluations/:submissionId/auto` | Faculty token; grade and immediately publish a submission using the configured local Ollama model |
| `GET` | `/api/analytics/faculty/overview?period=current` | Faculty token; derives roster engagement, submission volume, published-score distribution, and average score from the faculty member's records; `period=previous` selects the preceding 12 weeks |
| `GET` | `/api/analytics/student/leaderboard` | Student token; department ranking based on published evaluation percentages |
| `POST` | `/api/live-lab/heartbeat` | Student token; publish active editor/running status for a published assignment |
| `DELETE` | `/api/live-lab/sessions/:assignmentId` | Student token; end the current student's presence for that assignment |
| `GET` | `/api/live-lab/sessions` | Faculty token; list active sessions within the heartbeat window |
| `GET` | `/api/live-lab/secure-assessments/:assignmentId/current` | Student token; reconnect to the student's own attempt and server deadline |
| `POST` | `/api/live-lab/secure-assessments/:assignmentId/start` | Student token; start or resume the single Secure Lab attempt |
| `POST` | `/api/live-lab/secure-assessments/attempts/:attemptId/events` | Student token; record validated activity for the authenticated student's attempt |
| `DELETE` | `/api/live-lab/secure-assessments/attempts/:attemptId` | Student token; end an active attempt |
| `GET` | `/api/live-lab/secure-assessments/sessions` | Faculty token; list recent attempts for assignments owned by that faculty member |
| `GET` | `/api/live-lab/secure-assessments/activity/:attemptId` | Faculty token; retrieve the authorized attempt's activity timeline |
| `GET` | `/api/notifications` | Authenticated faculty or student; recent notifications derived from owned submissions, published assignments, and published feedback |
| `PATCH` | `/api/notifications/:id/read` | Authenticated recipient; mark one notification as read |
| `PATCH` | `/api/notifications/read-all` | Authenticated recipient; mark current notifications as read |
| `DELETE` | `/api/notifications/:id` | Authenticated recipient; dismiss one notification |
| `GET` | `/api/reports/faculty` | Faculty token; list report sections, saved template, and export history |
| `PUT` | `/api/reports/faculty/template` | Faculty token; persist selected sections and PDF/CSV format |
| `POST` | `/api/reports/faculty/exports` | Faculty token; create a data-backed report export record and return scoped report rows |
| `GET` | `/api/reports/faculty/exports/:id` | Faculty token; download data for an export owned by that faculty member |

Students see an evaluation only after publication. Both `GET /api/submissions/me` and `GET /api/submissions/:id` include published marks, faculty feedback, and AI feedback for the owning student; drafts remain faculty-only. Code runs use Docker containers with networking disabled, a read-only root filesystem, a non-root UID, dropped capabilities, PID/CPU/memory limits, a five-second per-case timeout, and capped output. Install Docker, configure `DOCKER_BIN` if it is not on `PATH`, and pull the official Python 3.12 Alpine, Node 22 Alpine, Eclipse Temurin 21 JDK, and GCC 14 runtime images before enabling execution. If Docker or an image is unavailable, the API returns `503` and no code runs on the API host. Add exact standard-input and expected-standard-output data to each executable case; legacy descriptive-only test cases need to be updated before they can run.

Live-lab presence is stored in MongoDB and refreshed by student coding workspaces; the faculty monitor polls for active sessions and expires inactive sessions. The plagiarism screen calculates a token-shingle similarity signal only between submissions for the same assignment and labels matches as possible overlaps for manual review, never as a verdict. The leaderboard uses published evaluation percentages for students in the same department; unpublished evaluations do not affect ranks. Theme preferences are saved per authenticated account and cached per account in the browser. Assignment drafts used for progress are stored in that student's browser and cleared after successful submission.

## Secure Lab Mode

Faculty can enable Secure Lab Mode per assignment from the create/edit forms. Settings include required fullscreen, tab-switch/fullscreen event recording, a warning threshold, a review-flag threshold, and a maximum fullscreen-exit count that auto-submits the attempt when reached. The fullscreen-exit auto-submit limit defaults to 0 (disabled). While the fullscreen assessment is active, the app navigation and sidebar are hidden so only the assignment workspace is shown. Existing assignments default to Secure Lab Mode disabled.

Students acknowledge the rules before starting. If fullscreen is required, the browser must successfully enter fullscreen before the API creates the attempt. The backend stores one attempt per student and assignment, calculates the authoritative deadline from the existing assignment time limit and due date, reconnects refreshed pages to that attempt, and rejects code runs/submissions after its deadline. Fullscreen re-entry does not reset the timer. Activity events are authenticated, rate limited, timestamped by the server, and kept separate from source code. A bounded in-memory queue retries transiently failed activity requests while the page remains open.

The existing **Live lab monitor** polls secure attempts alongside coding presence and supports assignment, status, and review-flag filters. Faculty can open the authorized activity timeline. Attempts are reviewable browser signals, not proof of misconduct; browser monitoring cannot detect every form of cheating and does not access cameras, microphones, or other applications.

To verify the flow:

1. Create or edit an assignment and enable Secure Lab Mode. Set a short time limit for deadline testing and configure at least one public test case.
2. Sign in as a student and open the assignment. Confirm the Secure Lab badge, duration, deadline, and rules screen appear.
3. Cancel and confirm no attempt starts. Return, accept the rules, enter Secure Mode, and verify fullscreen is active before the editor appears.
4. Run code, switch to another tab, return, and verify activity is recorded and warned. Exit fullscreen and re-enter; confirm the server deadline does not reset.
5. Refresh while the attempt is active and use **Re-enter Secure Mode**; verify the same attempt and timer resume.
6. Allow the timer to expire and confirm code execution/submission is rejected by the API. Submit before expiry in a separate run and verify the attempt closes.
7. As the assignment-owning faculty member, open **Live lab monitor**, inspect the secure attempt and its timeline, and verify review flags at the configured threshold.
8. Repeat with Secure Lab disabled and verify the existing coding flow remains unchanged.

The backend creates the `secure_assessment_attempts` collection and indexes at startup; no manual database migration or new environment variable is required. Run `npm --prefix backend test` and `npm run build` for backend and frontend checks. Fullscreen and visibility events depend on browser support and can be lost if the page closes or connectivity fails before delivery.
| `GET` | `/api/auth/me` | Requires `Authorization: Bearer <JWT>` |

Passwords are salted and hashed with scrypt. Login issues signed JWTs; short sessions last eight hours and remembered sessions last 30 days.

## Application routes

- Public frontend routes: `/login`, `/signin`
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
| `npm run user:create` | Create a faculty account interactively |
| `npm run user:password` | Reset an account password interactively |
| `npm --prefix backend test` | Run backend authentication and domain tests |