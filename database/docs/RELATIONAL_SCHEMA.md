# FitTrack - ER diagram to relational schema

The ER diagram is in [`er_diagram.png`](er_diagram.png) (source: [`er_diagram.mmd`](er_diagram.mmd)).
The relational schema below is the result of mapping that diagram onto MySQL 8 tables
(`database/schema.sql`), with the stored programs in `database/programmability.sql` and the roles in `database/security/roles.sql`.

## 1. Mapping rules used

| ER construct | Relational translation | Where |
|---|---|---|
| Entity `USERS`, `WORKOUT_PLANS`, `EXERCISES`, `WORKOUT_SESSIONS`, `WORKOUT_SETS`, `FITNESS_GOALS` | one table each, the entity key becomes the primary key | `schema.sql` |
| 1:1 `USERS` - `USER_PROFILES` | the profile table takes the user's id as **its primary key and foreign key** | `user_profiles.user_id` |
| 1:N `USERS` - `WORKOUT_PLANS`, `WORKOUT_SESSIONS`, `FITNESS_GOALS`, `ACTIVITY_LOG` | the foreign key `user_id` is placed on the "many" side | `user_id` columns |
| 1:N `WORKOUT_SESSIONS` - `WORKOUT_SETS` | foreign key `session_id` on the "many" side; `ON DELETE CASCADE` (a set cannot exist without its session) | `workout_sets.session_id` |
| optional 1:N `WORKOUT_PLANS` - `WORKOUT_SESSIONS` | nullable foreign key `plan_id`; `ON DELETE SET NULL` (history survives a deleted plan) | `workout_sessions.plan_id` |
| M:N `WORKOUT_PLANS` - `EXERCISES` (with attributes sets, reps, rest...) | **junction table** `PLAN_EXERCISES` with its own key and both foreign keys | `plan_exercises` |
| 1:N `USERS` - `ROLE_AUDIT_LOG` (two roles: actor, target) | two foreign keys to `users` in one table | `role_audit_log` |
| Event tables written by triggers | `ACTIVITY_LOG` (no entity in the ER; it is a log of database events) | `activity_log` |

## 2. Relational schema (keys underlined in notation: **PK**, _FK_, UK = unique)

```
USERS            (id PK, name, email UK, password_hash, role {admin|member}, created_at, last_login_at)
USER_PROFILES    (user_id PK/FK -> USERS.id, date_of_birth, gender, height_cm, weight_kg, fitness_level, updated_at)
EXERCISES        (id PK, name UK, description, muscle_group, equipment_needed)
WORKOUT_PLANS    (id PK, user_id FK -> USERS.id, name, description, created_at, updated_at)
PLAN_EXERCISES   (id PK, plan_id FK -> WORKOUT_PLANS.id, exercise_id FK -> EXERCISES.id,
                  sets, reps, target_weight, rest_seconds, exercise_order)
WORKOUT_SESSIONS (id PK, user_id FK -> USERS.id, plan_id FK -> WORKOUT_PLANS.id (nullable),
                  start_time, end_time (NULL = open), notes)
WORKOUT_SETS     (id PK, session_id FK -> WORKOUT_SESSIONS.id, exercise_id FK -> EXERCISES.id,
                  set_number, reps, weight, completed, UK(session_id, exercise_id, set_number))
FITNESS_GOALS    (id PK, user_id FK -> USERS.id, goal_type, target_value, start_date, deadline, status)
ACTIVITY_LOG     (id PK, user_id FK -> USERS.id, event_type, message, created_at)
ROLE_AUDIT_LOG   (id PK, actor_id FK -> USERS.id, target_user_id FK -> USERS.id, old_role, new_role, changed_at)
```

## 3. Data dictionary and constraints

| Table | Column | Type | Null | Constraint / note |
|---|---|---|---|---|
| users | id | INT AUTO_INCREMENT | no | **PK** |
| users | name | VARCHAR(255) | no | CHECK length 2-100 |
| users | email | VARCHAR(255) | no | **UNIQUE**, CHECK contains `@` and `.` |
| users | password_hash | VARCHAR(255) | no | bcrypt hash only; never plain text |
| users | role | ENUM('admin','member') | no | default `member`; index `idx_users_role` |
| users | created_at / last_login_at | TIMESTAMP | yes | |
| user_profiles | user_id | INT | no | **PK + FK** to users, ON DELETE CASCADE |
| user_profiles | gender | VARCHAR(20) | yes | CHECK in (female, male, non_binary, prefer_not_to_say) |
| user_profiles | height_cm / weight_kg | DECIMAL(5,1) | yes | CHECK 50-260 cm / 20-400 kg |
| user_profiles | fitness_level | VARCHAR(20) | yes | CHECK in (beginner, intermediate, advanced) |
| exercises | id | INT AUTO_INCREMENT | no | **PK** |
| exercises | name | VARCHAR(255) | no | **UNIQUE** |
| workout_plans | id / user_id | INT | no | PK / FK to users, CASCADE |
| plan_exercises | id | INT AUTO_INCREMENT | no | PK |
| plan_exercises | plan_id | INT | no | FK to workout_plans, CASCADE |
| plan_exercises | exercise_id | INT | no | FK to exercises, **RESTRICT** (a used exercise cannot be deleted) |
| plan_exercises | sets / reps / rest_seconds | INT | - | CHECK sets 1-50, reps 1-500, rest 0-3600 |
| workout_sessions | id | INT AUTO_INCREMENT | no | PK |
| workout_sessions | user_id | INT | no | FK to users, CASCADE; index `(user_id, start_time)` |
| workout_sessions | plan_id | INT | yes | FK to workout_plans, SET NULL |
| workout_sessions | end_time | DATETIME | yes | NULL while in progress; CHECK end >= start |
| workout_sets | id | INT AUTO_INCREMENT | no | PK |
| workout_sets | session_id | INT | no | FK to sessions, CASCADE |
| workout_sets | exercise_id | INT | no | FK to exercises, RESTRICT; index |
| workout_sets | reps / weight | INT / DECIMAL(5,2) | yes | CHECK reps 0-500, weight 0-999 |
| workout_sets | (session_id, exercise_id, set_number) | - | - | **UNIQUE** - no duplicate set |
| fitness_goals | id / user_id | INT | no | PK / FK to users, CASCADE; index `(user_id, status)` |
| fitness_goals | target_value | INT | no | CHECK > 0 |
| fitness_goals | deadline | DATE | yes | CHECK deadline >= start_date |
| fitness_goals | status | VARCHAR(50) | yes | CHECK in (active, completed, overdue); set to `completed` by trigger |
| activity_log | id / user_id / event_type / message | - | no | FK to users, CASCADE; index `(user_id, created_at)` |
| role_audit_log | actor_id / target_user_id | INT | no | FKs to users, CASCADE |
| role_audit_log | old_role / new_role | VARCHAR(10) | no | written only by `sp_change_role` |

**Normal form.** Every non-key attribute depends only on its table's primary key (3NF). Exercise details live once
in `exercises` and are referenced by id; the per-plan targets (sets, reps, rest) live in `plan_exercises`, not in the plan
or the exercise. The only deliberate duplication is `workout_sessions.plan_id` vs the plan name, which is read by a join.

## 4. Stored programs (database logic)

| Object | Type | Purpose |
|---|---|---|
| `trg_sets_locked_session` | BEFORE INSERT trigger on `workout_sets` | refuses sets for a finished session (business rule) |
| `trg_session_finished` | AFTER UPDATE trigger on `workout_sessions` | when a session is finished: writes `activity_log`, and marks any active weekly goal that is now reached as `completed` |
| `sp_change_role(actor, target, role)` | procedure | role change with checks (caller must be admin, role value valid, last admin kept) and an audit row |
| `fn_session_volume(session_id)` | function | total kg x reps of completed sets |
| `v_user_directory` | view | users with profile, sessions and active goals |
| `v_session_summary` | view | sessions with member, plan, duration and volume (uses the function) |

## 5. Database-level roles (RBAC)

| Privilege | `fittrack_member` (account `ft_member`) | `fittrack_admin` (account `ft_admin`) |
|---|---|---|
| Read plans, sessions, sets, goals, profiles, exercises | yes | yes |
| Read `users` columns except `password_hash` | yes | yes (all) |
| Read `role_audit_log` | **no** | yes |
| Insert / update / delete own working data (plans, sessions, sets, goals) | yes | yes |
| Update `users.role` or `password_hash` | **no** | yes |
| Edit exercise catalogue | **no** (read only) | yes |
| Execute `sp_change_role` | **no** | yes |
| DDL (`DROP`, `ALTER`, `CREATE`) | **no** | yes |

Row ownership (a member only edits *their own* rows) is enforced by the API (`WHERE user_id = ?`).
MySQL has no built-in row-level security, so the database role limits *which tables and columns* a member can touch.

## 6. NoSQL component - Memurai (Redis protocol)

Used for data that is written very often, is append-only, or has a flexible shape. It is not joined with the SQL tables.

| Key pattern | Redis type | Written by | Example CRUD |
|---|---|---|---|
| `fittrack:sensors:{userId}` | Stream | wearable simulator (every 5 s) | `XADD` create, `XRANGE`/`XREVRANGE` read, `XDEL` delete |
| `fittrack:activity:daily:{userId}:{YYYY-MM-DD}` | Hash | simulator and daily totals | `HSET`/`HINCRBY` create/update, `HGETALL` read, `HDEL` delete |
| `fittrack:journal:{userId}:{id}` | String (JSON) | journal page | `SET` create/update (`XX`), `GET`, `SCAN`, `DEL` |
| `fittrack:photos:{userId}:{id}` | String (JSON) | gallery page | `SET`, `GET`, `DEL` |

Access control for Memurai/Redis: an ACL user `ft_redis_member` is limited to the `fittrack:*` keys, read and write only,
with dangerous and admin commands removed (`database/demo/09_redis_acl.sh`).
