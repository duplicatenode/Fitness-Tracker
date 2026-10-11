# FitTrack UI redesign — change log

## Root cause of the unstyled page
Tailwind CSS **v4** was installed, but the project was set up for **v3**:
`src/index.css` used `@tailwind base/components/utilities` and `@apply`, `tailwind.config.js` used the v3 `content` option, there was no `@tailwindcss/vite` plugin and no PostCSS config. Vite therefore shipped the directives untouched (a 340-byte CSS file with zero utility classes), so the browser fell back to default styles. The build did not fail, which hid the problem.

**Fix:** `@tailwindcss/vite` added to `vite.config.js`, `index.css` rewritten with `@import "tailwindcss"` + `@theme` design tokens, `tailwind.config.js` removed, unused `postcss`/`autoprefixer` dev-deps removed. Inter is self-hosted via `@fontsource-variable/inter`.

## Frontend (all in `frontend/`)
Rewritten: `App.jsx`, `main.jsx`, `index.css`, `api.js`, `index.html`, `vite.config.js`, `package.json`.
New: app shell (sidebar, header, mobile drawer), pages for Overview, Workout Plans, History, Goals, Journal, Analytics, Gallery and Login; shared components (metric card, page header, modal/confirm, empty/error/loading states, progress bar, simulator status, charts); contexts and a `useFetch` hook.
Removed: Vite template leftovers (`App.css`, `assets/*`, `public/icons.svg`) and `tailwind.config.js`.

## Backend additions (additive — existing routes and response shapes unchanged)
| Endpoint | Why |
|---|---|
| `POST /api/auth/demo`, `GET /api/auth/me` | Demo login without a password in frontend code; profile for greeting/avatar. Disable demo with `DEMO_LOGIN_ENABLED=false`. |
| `GET/POST/PUT/DELETE /api/goals` | Goals CRUD. Progress is computed from real data for `weekly_workouts` (sessions in MySQL), `daily_steps` and `daily_calories` (Memurai daily hash); other goal types return no progress. |
| `GET/PUT/DELETE /api/workouts/plans/:id`, optional `exercises[]` on plan create/update | Plan view/edit/delete and exercise lists. `GET /plans` now also returns `exercise_count` and `session_count`. |
| `GET /api/workouts/sessions?from=&to=`, `GET /sessions/:id`, `PUT /sessions/:id/end` | Date filter, session detail, finish a session. Sessions now include `duration_minutes`, `exercises_completed`, `sets_completed`. |
| `PUT/DELETE /api/journals/:id` | Journal edit and delete. |
| `GET /api/activity/status`, `/readings?range=1h\|24h\|7d\|30d`, `/daily?days=N` | Simulator status (derived from newest reading), bucketed time-series, daily totals — all from the Memurai stream/hashes. |
| `GET/POST/DELETE /api/photos` | Progress-photo metadata (`fittrack:photos:{userId}:{id}`, as designed in `database/README.md`). No image files are stored. |
| `GET /api/dashboard` | Added `completedWorkouts`, `workoutsThisWeek` (existing fields untouched). |

`backend/package.json` gained `start` and `dev` scripts.

## Notes
* Simulator status: **Connected** = newest reading ≤ 20 s old; **No recent readings** = older; **Disconnected** = no readings at all or backend/Memurai unreachable.
* "Today" uses UTC dates because the simulator and dashboard already key daily data by UTC.
* No trend percentages are shown — the backend has no comparable history to back them.
* Security: the original `.env.example` contained what looks like a real MySQL password; it has been replaced with a placeholder. If that was your real password, change it.

---

# Update 2 — accounts, sign-up and per-user data

## What changed
* **Sign up page** (`/signup`) and a redesigned **Sign in** page with a link between them. Client-side validation (name, email, password rules with a live checklist, confirm password, show/hide password) and clear server errors (e.g. "An account with this email already exists.").
* **My profile page** (`/profile`, via the avatar or the sidebar user block): view account info (member since, last sign-in, account ID), edit personal details, change password.
* **MySQL user storage**
  * `users` — `id, name, email (UNIQUE), password_hash (bcrypt), created_at, last_login_at` (**new column**)
  * `user_profiles` (**new table**, 1:1 with `users`, `ON DELETE CASCADE`) — `date_of_birth, gender, height_cm, weight_kg, fitness_level, updated_at`
  * Registering writes both rows in **one transaction** (all-or-nothing).
  * Existing databases upgrade automatically when the backend starts (`backend/src/config/ensureSchema.js`, idempotent); `node database/migrate.js` does the same on demand. `schema.sql` includes both for fresh installs.
* **Backend**
  * `POST /api/auth/register` now validates (name 2–100 chars, valid email stored lower-case, password ≥ 8 chars with a letter and a number, max 72, optional profile fields range-checked), creates user + profile, and returns `token` and `user` so the user is signed in immediately. Existing response fields (`message`, `userId`) and the `400 User already exists` behaviour are kept.
  * `POST /api/auth/login` is case-insensitive on email and records `last_login_at`; responses include the full `user` (with `profile`).
  * New: `PUT /api/auth/me` (edit name + profile), `PUT /api/auth/password` (requires the current password).
* **Simulator** now generates readings for **every user in MySQL** (re-read every 30 s), not only user 1, so each new account gets its own live data. It uses `mysql2` (run `npm install` in `simulator/` once).
* **Tools:** `node database/show_users.js` prints all users and profiles (password shown only as a hash prefix). `database/queries.sql` has two new queries (users ⨝ profiles, per-user activity summary).

## Tested
Registration/login/profile/password APIs (validation matrix, duplicate emails, case-insensitive login, hashed storage), upgrade of an old-schema database, a fresh install from `setup_mysql.js`, multi-user simulator output, and 23 browser checks for sign-up/profile/login/logout plus the earlier 63-check regression suite (all passing).

## Not included
Email verification, password reset by email, and rate-limiting of login attempts. For a real deployment, set a strong `JWT_SECRET` in `.env`.
