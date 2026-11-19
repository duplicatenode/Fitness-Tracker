# Fitness tracker

Fitness tracker with a **hybrid DBMS**: MySQL (users, roles, profiles, plans, sessions, goals, triggers, procedures, views)
and Memurai/Redis (simulated wearable stream, daily totals, journals, photo metadata).

## Architecture
```
Next.js 16 (App Router, frontend/)  --HTTP + JWT-->  Express 5 API (backend/)  --> MySQL 8   (structured, relational data)
        http://localhost:3000                          http://localhost:5000     --> Memurai  (streams, hashes, JSON documents)
                                                              ^
                               wearable simulator (simulator/) writes readings to Memurai every 5 s
```
- **Frontend:** Next.js App Router. Each screen is a route in `frontend/src/app/`; signed-in screens share the layout in `frontend/src/app/(app)/layout.jsx`.
- **Backend/API:** Express route handlers in `backend/src/routes` and `backend/src/controllers`. Every route except sign-in/sign-up needs a JWT; admin routes also check the role in MySQL.
- **Configuration:** all credentials and secrets come from `.env` (git-ignored). The backend refuses to start if `JWT_SECRET`, `DB_USER` or `DB_PASSWORD` is missing.

- **Demo and DBMS documentation:** [`DEMO_GUIDE.md`](DEMO_GUIDE.md) (commands and expected results)
- **ER diagram and relational schema:** [`database/docs/`](database/docs)
- **Screen-to-table mapping:** [`database/docs/UI_TABLE_MAPPING.md`](database/docs/UI_TABLE_MAPPING.md)

## Setup (once)
1. Copy `.env.example` to `.env` and fill in the values (MySQL root password, the two database account passwords, Redis settings). `.env` is git-ignored.
2. Make sure **MySQL** and **Memurai** are running.
3. Install packages:
   ```
   npm install            (project root - needed by the database scripts)
   cd backend  && npm install
   cd frontend && npm install
   cd simulator && npm install
   ```
4. Build the database (creates tables, triggers, procedure, function, views, seed data, database roles and accounts):
   ```
   node database\setup_mysql.js
   ```
   Running it on an older `fittrack_db` upgrades it in place (for example, the old `exercises.muscle_group` text becomes the `body_parts` table); `node database\migrate.js` does the same without re-seeding.

## Run (three separate terminals, all from the project root)
| Terminal | Command | Notes |
|---|---|---|
| 1 | `cd backend` then `npm start` | API on http://localhost:5000 |
| 2 | `cd frontend` then `npm run dev` | Next.js app on http://localhost:3000 |
| 3 | `node simulator\wearableSimulator.js` | Generates readings for **every registered user** |

Open http://localhost:3000, then sign in with a demo account (see [`DEMO_GUIDE.md`](DEMO_GUIDE.md#demo-accounts-passwords-are-stored-only-as-bcrypt-hashes)), **Create an account**, or **Continue as demo user**.
Admins see an extra **Users & roles** page.

## Roles
| Level | Role | What it can do |
|---|---|---|
| Application (`users.role`) | `member` | builds plans by picking **body parts** (gets the admin's exercises with default sets/reps); own sessions, goals, journal and gallery |
| Application (`users.role`) | `admin` | everything a member can do, plus **Exercise catalogue** (body parts, their exercises and default sets/reps) and **Users & roles** (change roles, see the activity and audit logs) |
| Database (MySQL roles) | `fittrack_member` (account `ft_member`) | reads app data (never password hashes or the audit log), reads but cannot change body parts or exercises, writes own working data |
| Database (MySQL roles) | `fittrack_admin` (account `ft_admin`) | full control of `fittrack_db` |

## Where user data lives
| Data | Store | Table / key |
|---|---|---|
| Account (name, email, bcrypt password hash, role, created, last sign-in) | MySQL | `users` |
| Personal details | MySQL | `user_profiles` (1:1 with `users`) |
| Exercise catalogue (admin-managed) | MySQL | `body_parts`, `exercises` (each exercise has one body part and default sets/reps) |
| Plans, exercises in a plan, sessions, sets, goals | MySQL | `workout_plans`, `plan_exercises`, `workout_sessions`, `workout_sets`, `fitness_goals` |
| Automatic logs (written by triggers / procedure) | MySQL | `activity_log`, `role_audit_log` |
| Wearable readings, daily totals | Memurai | `fittrack:sensors:{userId}`, `fittrack:activity:daily:{userId}:{date}` |
| Journals, photo entries | Memurai | `fittrack:journal:{userId}:{id}`, `fittrack:photos:{userId}:{id}` |

Passwords are never stored in plain text: only bcrypt hashes. Database credentials come from `.env`, never from the source code.

## API (Express, base URL `http://localhost:5000/api`)
| Area | Endpoints | Store |
|---|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/demo`, `GET/PUT /auth/me`, `PUT /auth/password` | MySQL `users`, `user_profiles` (register runs in one transaction) |
| Plans | `GET /workouts/body-parts`, `GET /workouts/exercises`, `GET/POST /workouts/plans` (`{ name, body_part_ids }`), `GET/PUT/DELETE /workouts/plans/:id` | MySQL `workout_plans`, `plan_exercises` (filled by `INSERT ... SELECT` from `exercises`), `body_parts` |
| Sessions | `GET/POST /workouts/sessions`, `GET /workouts/sessions/:id`, `PUT /workouts/sessions/:id/end` | MySQL `workout_sessions`, `workout_sets` (finishing fires `trg_session_finished`) |
| Goals | `GET/POST /goals`, `PUT/DELETE /goals/:id` | MySQL `fitness_goals`, progress from MySQL + Memurai |
| Journal | `GET/POST /journals`, `PUT/DELETE /journals/:id` | Memurai `fittrack:journal:*` |
| Gallery | `GET/POST /photos`, `DELETE /photos/:id` | Memurai `fittrack:photos:*` |
| Activity | `GET /activity/status`, `/activity/readings?range=1h\|24h\|7d\|30d`, `/activity/daily?days=N` | Memurai stream + daily hashes |
| Dashboard | `GET /dashboard` | both |
| Admin (admin role only) | `GET /admin/users`, `PUT /admin/users/:id/role`, `GET /admin/activity` | MySQL, role change through `sp_change_role` |
| Catalogue (admin role only) | `GET/POST /admin/body-parts`, `PUT/DELETE /admin/body-parts/:id`, `POST /admin/exercises`, `PUT/DELETE /admin/exercises/:id` | MySQL `body_parts`, `exercises` (`ON DELETE RESTRICT` protects ones in use) |

## Useful commands
```
node database\show_users.js                  list users, roles and profiles
node database\migrate.js                     upgrade an existing database
node database\memurai_setup.js               test Memurai and write sample data
```

## Team contributions

| Member | SRN | Contributions |
|---|---|---|
| Sarthki Vachhani | PES1UG24CS422 | MySQL schema and constraints, triggers and procedure, seed data, demo scripts, Express API |
| Sejal Siddapuram | PES1UG24CS426 | Next.js frontend, backend cleanup, documentation and project report, testing |
Project report (objectives, requirements, architecture, screenshots, test results, conclusion): [`docs/PROJECT_REPORT.md`](docs/PROJECT_REPORT.md)
