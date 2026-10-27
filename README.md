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
   An older `fittrack_db` can be upgraded in place with `node database\migrate.js`, or dropped first for a clean start.

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
| Application (`users.role`) | `member` | own plans, sessions, goals, journal and gallery |
| Application (`users.role`) | `admin` | everything a member can do, plus **Users & roles** (change roles, see the activity and audit logs) |
| Database (MySQL roles) | `fittrack_member` (account `ft_member`) | reads app data (never password hashes or the audit log), writes own working data |
| Database (MySQL roles) | `fittrack_admin` (account `ft_admin`) | full control of `fittrack_db` |

## Where user data lives
| Data | Store | Table / key |
|---|---|---|
| Account (name, email, bcrypt password hash, role, created, last sign-in) | MySQL | `users` |
| Personal details | MySQL | `user_profiles` (1:1 with `users`) |
| Plans, exercises in a plan, sessions, sets, goals | MySQL | `workout_plans`, `plan_exercises`, `exercises`, `workout_sessions`, `workout_sets`, `fitness_goals` |
| Automatic logs (written by triggers / procedure) | MySQL | `activity_log`, `role_audit_log` |
| Wearable readings, daily totals | Memurai | `fittrack:sensors:{userId}`, `fittrack:activity:daily:{userId}:{date}` |
| Journals, photo entries | Memurai | `fittrack:journal:{userId}:{id}`, `fittrack:photos:{userId}:{id}` |

Passwords are never stored in plain text: only bcrypt hashes. Database credentials come from `.env`, never from the source code.

## API (Express, base URL `http://localhost:5000/api`)
| Area | Endpoints | Store |
|---|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/demo`, `GET/PUT /auth/me`, `PUT /auth/password` | MySQL `users`, `user_profiles` (register runs in one transaction) |
| Plans | `GET /workouts/exercises`, `GET/POST /workouts/plans`, `GET/PUT/DELETE /workouts/plans/:id` | MySQL `workout_plans`, `plan_exercises`, `exercises` |
| Sessions | `GET/POST /workouts/sessions`, `GET /workouts/sessions/:id`, `PUT /workouts/sessions/:id/end` | MySQL `workout_sessions`, `workout_sets` (finishing fires `trg_session_finished`) |
| Goals | `GET/POST /goals`, `PUT/DELETE /goals/:id` | MySQL `fitness_goals`, progress from MySQL + Memurai |
| Journal | `GET/POST /journals`, `PUT/DELETE /journals/:id` | Memurai `fittrack:journal:*` |
| Gallery | `GET/POST /photos`, `DELETE /photos/:id` | Memurai `fittrack:photos:*` |
| Activity | `GET /activity/status`, `/activity/readings?range=1h\|24h\|7d\|30d`, `/activity/daily?days=N` | Memurai stream + daily hashes |
| Dashboard | `GET /dashboard` | both |
| Admin (admin role only) | `GET /admin/users`, `PUT /admin/users/:id/role`, `GET /admin/activity` | MySQL, role change through `sp_change_role` |

## Useful commands
```
node database\show_users.js                  list users, roles and profiles
node database\migrate.js                     upgrade an existing database
node database\memurai_setup.js               test Memurai and write sample data
```
