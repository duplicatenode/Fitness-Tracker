# FitTrack frontend

React 19 + Vite 8 + Tailwind CSS v4 + Recharts + Lucide.

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build
```

* API base URL: `VITE_API_URL` (default `http://localhost:5000/api`) — see `.env.example`.
* Styling: `src/index.css` holds the Tailwind v4 import and all design tokens (`@theme`). Tailwind runs through `@tailwindcss/vite` in `vite.config.js`; there is no `tailwind.config.js` / PostCSS config in v4.
* Structure: `src/pages` (one file per page), `src/components` (shell, cards, modal, states, charts), `src/context` (auth, simulator status, toasts, header controls), `src/hooks/useFetch.js`, `src/api.js` (central axios client).
