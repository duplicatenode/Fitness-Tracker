# Fitness tracker

Fitness tracker with a **hybrid DBMS**: MySQL (users, roles, profiles, plans, sessions, goals, triggers, procedures, views)
and Memurai/Redis (simulated wearable stream, daily totals, journals, photo metadata).

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
| 2 | `cd frontend` then `npm run dev` | App on http://localhost:5173 |
| 3 | `node simulator\wearableSimulator.js` | Generates readings for **every registered user** |

Open http://localhost:5173, then sign in with a demo account (see [`DEMO_GUIDE.md`](DEMO_GUIDE.md#demo-accounts-passwords-are-stored-only-as-bcrypt-hashes)), **Create an account**, or **Continue as demo user**.
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

## Useful commands
```
node database\show_users.js                  list users, roles and profiles
node database\migrate.js                     upgrade an existing database
node database\memurai_setup.js               test Memurai and write sample data
```
