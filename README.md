# FitTrack

Fitness tracker with a **hybrid DBMS**: MySQL (users, profiles, plans, sessions, goals) + Memurai/Redis (simulated wearable stream, daily totals, journals, photo metadata).

## Setup (once)
1. Copy `.env.example` to `.env` and fill in your MySQL password.
2. Make sure **MySQL** and **Memurai** are running.
3. Create the database (first time only):
   ```
   node database/setup_mysql.js
   ```
   If you already have a FitTrack database from an earlier version, just start the backend — it upgrades the schema itself (or run `node database/migrate.js`).
4. Install packages (from the project root):
   ```
   cd backend   && npm install
   cd ..\frontend  && npm install
   cd ..\simulator && npm install
   ```

## Run (three separate terminals, all from the project root)
| Terminal | Command | Notes |
|---|---|---|
| 1 | `cd backend` then `npm start` | API on http://localhost:5000 |
| 2 | `cd frontend` then `npm run dev` | App on http://localhost:5173 |
| 3 | `node simulator\wearableSimulator.js` | Generates readings for **every registered user** |

Open http://localhost:5173 → **Create an account**, or **Continue as demo user**.

## Where user data lives
| Data | Store | Table / key |
|---|---|---|
| Account (name, email, bcrypt password hash, created, last sign-in) | MySQL | `users` |
| Personal details (date of birth, gender, height, weight, fitness level) | MySQL | `user_profiles` (1:1 with `users`) |
| Plans, sessions, sets, goals | MySQL | `workout_plans`, `workout_sessions`, `workout_sets`, `fitness_goals` |
| Wearable readings, daily totals | Memurai | `fittrack:sensors:{userId}`, `fittrack:activity:daily:{userId}:{date}` |
| Journals, photo entries | Memurai | `fittrack:journal:{userId}:{id}`, `fittrack:photos:{userId}:{id}` |

Passwords are never stored in plain text — only bcrypt hashes.

**See every user and their details:**
```
node database/show_users.js
```
or in MySQL: `USE fittrack_db; SELECT * FROM users;` and `SELECT * FROM user_profiles;` (a ready-made join is query 6 in `database/queries.sql`).
