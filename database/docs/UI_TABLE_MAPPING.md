# FitTrack - UI to backend to database mapping

Every screen, the API it calls, the controller that answers, and the database objects it reads or writes.
C = create, R = read, U = update, D = delete. "Redis" = Memurai.

| Screen (route) | What the user sees | API call | Controller function | Database objects | Ops |
|---|---|---|---|---|---|
| Sign in (`/login`) | login form, demo button | `POST /api/auth/login`, `POST /api/auth/demo` | `authController.login` / `demoLogin` | `users` (R), `last_login_at` (U) | R, U |
| Sign up (`/signup`) | account + profile form | `POST /api/auth/register` | `authController.register` | `users` (C), `user_profiles` (C), one transaction | C |
| My profile (`/profile`) | account details, edit profile, change password | `GET/PUT /api/auth/me`, `PUT /api/auth/password` | `me`, `updateMe`, `changePassword` | `users` (R, U name), `user_profiles` (R, U) | R, U |
| Overview (`/`) | totals, active goals, live heart rate, charts | `GET /api/dashboard`, `/goals`, `/workouts/sessions`, `/journals`, `/activity/readings`, `/activity/daily` | `dashboardController`, `goalController`, `workoutController`, `activityController` | `workout_sessions` (R), `fitness_goals` (R), Redis sensors/daily/journal | R |
| Workout plans (`/plans`) | list, create, edit, delete plans with exercises, start a session | `GET/POST /api/workouts/plans`, `GET/PUT/DELETE /api/workouts/plans/:id`, `GET /api/workouts/exercises`, `POST /api/workouts/sessions` | `workoutController.getPlans`, `createPlan`, `updatePlan`, `deletePlan`, `createSession` | `workout_plans` (CRUD), `plan_exercises` (CRUD), `exercises` (R), `workout_sessions` (C) | C, R, U, D |
| Workout history (`/history`) | sessions by date, session detail, finish a session | `GET /api/workouts/sessions?from&to`, `GET /sessions/:id`, `POST /sessions`, `PUT /sessions/:id/end` | `getSessions`, `getSession`, `createSession`, `endSession` | `workout_sessions` (R, C, U end_time), `workout_sets` (R), **trigger `trg_session_finished` fires on finish** | C, R, U |
| Fitness goals (`/goals`) | goal cards with progress, create, edit, delete | `GET/POST /api/goals`, `PUT/DELETE /api/goals/:id` | `goalController.getGoals`, `createGoal`, `updateGoal`, `deleteGoal` | `fitness_goals` (CRUD); progress from `workout_sessions` (finished) and Redis daily hash; **status set to `completed` by the trigger** | C, R, U, D |
| Workout journal (`/journal`) | journal entries, create, edit, delete | `GET/POST /api/journals`, `PUT/DELETE /api/journals/:id` | `journalController` | Redis `fittrack:journal:{userId}:{id}` (CRUD) | C, R, U, D |
| Activity analytics (`/analytics`) | heart-rate and steps charts, state breakdown | `GET /api/activity/status`, `/readings?range`, `/daily?days` | `activityController` | Redis `fittrack:sensors:{userId}` (R), `fittrack:activity:daily:*` (R) | R |
| Progress gallery (`/gallery`) | photo metadata cards, add, delete | `GET/POST/DELETE /api/photos` | `photoController` | Redis `fittrack:photos:{userId}:{id}` (CRUD) | C, R, D |
| **Users & roles (`/admin`, admins only)** | every account with its role, role dropdown, activity log, role audit | `GET /api/admin/users`, `PUT /api/admin/users/:id/role`, `GET /api/admin/activity` | `adminController.listUsers`, `changeRole`, `activity`; middleware `requireRole('admin')` | `v_user_directory` (R), **`sp_change_role` (CALL)** writes `role_audit_log` and `users.role`, `activity_log` (R) | R, U |
| Simulator pill (every page) | connected / no recent readings / disconnected | `GET /api/activity/status` | `activityController.getStatus` | Redis `fittrack:sensors:{userId}` (newest entry) | R |

## Where each rule is enforced

| Rule | Enforced in | Mechanism |
|---|---|---|
| A user must be signed in | API | `authMiddleware` (JWT) |
| Only admins reach `/api/admin/*` | API **and** database | `requireRole('admin')` reads the role from `users` on each request; `sp_change_role` checks the caller again and needs EXECUTE privilege |
| Passwords stored only as bcrypt | API + database | `bcrypt.hash` before insert; `password_hash` is not readable by members |
| Sets cannot be added to a finished session | database | trigger `trg_sets_locked_session` |
| Goals auto-complete when the weekly target is reached | database | trigger `trg_session_finished` (goal progress in the UI reads the same rule) |
| Value ranges (reps, weight, height, goal target, dates) | database | `CHECK` constraints in `schema.sql` (the API also validates and returns friendly messages) |
| No duplicate sets | database | `UNIQUE (session_id, exercise_id, set_number)` |
| Database credentials are not in code | configuration | `.env` (`DB_*`, `DB_ADMIN_PASSWORD`, `DB_MEMBER_PASSWORD`, `REDIS_*`); `.env` is git-ignored |
