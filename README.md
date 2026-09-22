# CERA Code

CERA (Code Execution, Review and Assessment) is a React frontend for teaching and evaluating programming assignments. It provides separate workspaces for students and faculty, with code submission, evaluation, analytics, plagiarism review, and live lab monitoring workflows.

## Features

### Student workspace

- View the student dashboard and available assignments
- Open assignment details and submit code
- Review submission history, results, and detailed feedback
- Track leaderboard standings and notifications
- Manage the student profile

### Faculty workspace

- Monitor teaching activity from the dashboard
- Create, edit, and manage assignments and test cases
- Review submissions and evaluate code
- Use AI review, plagiarism comparison, and difficulty analysis tools
- Monitor live labs and student activity
- View analytics, reports, notifications, profile, and settings

## Requirements

- Node.js 18 or newer
- npm 9 or newer

## Getting started

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173`.

## Authentication

When `VITE_API_BASE_URL` is not configured, the app uses an in-memory mock authentication service:

- Any email and non-empty password can be used to sign in.
- An email containing `faculty` signs in to the faculty workspace.
- Other emails sign in to the student workspace.
- New accounts created through signup are student accounts and are stored only for the current browser session.

For a real backend, create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:3000
```

The frontend then calls `/api/auth/login` and `/api/auth/signup` on that API.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build in `dist/public` |
| `npm run serve` | Preview the production build locally |

## Route overview

Public routes are `/login`, `/signin`, and `/signup`.

Faculty routes use the root path, including `/dashboard`, `/assignments`, `/submissions`, `/evaluation-queue`, `/ai-review`, `/plagiarism`, `/analytics`, `/reports`, and `/live-lab`.

Student routes are grouped under `/student/*`, including `/student/dashboard`, `/student/assignments`, `/student/submit/:id`, `/student/submissions`, `/student/results`, and `/student/leaderboard`.

## Project structure

```text
src/
	components/   Shared, faculty, student, and code-focused UI components
	context/      Authentication, theme, notifications, and app state
	data/         Mock data used by the frontend workflows
	layouts/      Auth, faculty, and student page layouts
	pages/        Route-level screens grouped by workspace
	routes/       Public, protected, faculty, and student routing
	services/     Authentication, assignment, evaluation, analytics, and API services
	utils/        Export, date formatting, and validation helpers
```

The project uses React JSX and Vite, with Tailwind CSS, Framer Motion, Lucide React, Recharts, Monaco Editor, React Router, and Wouter. There are currently no TypeScript source files.