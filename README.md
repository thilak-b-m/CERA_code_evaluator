# CERA Code

Unified student and faculty frontend for CERA — Code Execution, Review and Assessment.

## Requirements

- Node.js 18 or newer
- npm 9 or newer

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173`.

## Production build

```bash
npm run build
npm run serve
```

The app is React JSX with Vite, Tailwind CSS, Framer Motion, Lucide React, React Router, Recharts, Monaco Editor, and Wouter. Faculty routes use the existing faculty workspace paths; student routes are grouped under `/student/*`. No TypeScript source files are used.