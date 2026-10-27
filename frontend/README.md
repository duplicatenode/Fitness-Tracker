# FitTrack frontend

Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + Recharts + Lucide.

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build && npm start   # production build
```

* **API:** the app talks to the Express backend through `src/api.js` (axios, JWT attached to every request).
  Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:5000/api`) - see `.env.example`.
* **Routes:** `src/app/` - `login/`, `signup/` and the signed-in group `(app)/` (overview, plans, history, goals, journal,
  analytics, gallery, profile, admin). `(app)/layout.jsx` wraps them in the sidebar/header shell and sends signed-out users to `/login`.
* **Screens:** `src/views/` (one component per screen), `src/components/` (shell, cards, modal, states, charts),
  `src/context/` (auth, simulator status, toasts, header controls), `src/hooks/useFetch.js`.
* **Styling:** `src/index.css` holds the Tailwind v4 import and the design tokens (`@theme`); Tailwind runs through `postcss.config.mjs`.
