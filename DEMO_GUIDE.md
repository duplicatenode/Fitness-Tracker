# FitTrack - DBMS Level 3 demo guide

Everything below runs on the database that `database/setup_mysql.js` builds. Each demo item is one file, so you can
open it in a notepad and copy the command.

Commands are for **Windows (cmd)**. Use `cmd /c "..."` in PowerShell so that `<` redirection works. The Redis ACL script
(item 9b) needs Git Bash.

---

## 1. One-time setup (before the evaluation)

1. Copy `.env.example` to `.env` and fill in:
   - `DB_PASSWORD` - your MySQL root password
   - `DB_ADMIN_PASSWORD` and `DB_MEMBER_PASSWORD` - new passwords for the two database accounts (`ft_admin`, `ft_member`)
   - `REDIS_MEMBER_PASSWORD` - password for the Redis member user (only for demo 9b)
   `.env` is git-ignored. Passwords are never written into any `.sql` or `.js` file.
2. Start MySQL and Memurai.
3. Install packages once: `npm install` in the project root, then in `backend`, `frontend` and `simulator`.
4. Build the database:
   ```
   node database\setup_mysql.js
   ```
   This creates the tables, the triggers, the procedure, the function, the views, the seed data, the database roles and the two accounts.
   If an older `fittrack_db` exists, first run `DROP DATABASE fittrack_db;` for a clean state.
5. Start the app (three terminals, from the project root):
   | Terminal | Command |
   |---|---|
   | 1 | `cd backend` then `npm start` |
   | 2 | `cd frontend` then `npm run dev` (Next.js, http://localhost:3000) |
   | 3 | `node simulator\wearableSimulator.js` |

### Demo accounts (passwords are stored only as bcrypt hashes)

| Who | Email | Password | App role | Database account |
|---|---|---|---|---|
| Demo member | demo@fittrack.com | FitTrackDemo123! | member | - |
| Admin | admin@fittrack.com | Admin@2026 | admin | `ft_admin` (password from `.env`) |
| Member | ravi@fittrack.com | Member@2026 | member | `ft_member` (password from `.env`) |
| Member (trigger demo) | meera@fittrack.com | Member@2026 | member | - |

Before each rehearsal or presentation, run `database\demo\00_reset_for_rehearsal.sql` so that item 7 starts from the same point.

---

## 2. The demo, item by item

### Item 1 - How many users, and their roles
```
cmd /c "mysql -u ft_admin -p -h localhost fittrack_db < database\demo\01_users_and_roles.sql"
```
Shows `COUNT(*)` (4 users), counts per role (1 admin, 3 members), the directory view, and the account's database role.
**In the app:** sign in as `admin@fittrack.com` and open **Users & roles**. Same data, with role counts.

### Item 2 - ER diagram
Open `database\docs\er_diagram.png` (source: `database\docs\er_diagram.mmd`).

### Item 3 - How the ER diagram became a relational schema
Open `database\docs\RELATIONAL_SCHEMA.md` (sections 1 to 3: mapping rules, schema, data dictionary).
To show the real database, run:
```
cmd /c "mysql -u ft_admin -p -h localhost fittrack_db < database\demo\02_schema_inspection.sql"
```
It lists the tables, primary and foreign keys, CHECK and UNIQUE constraints, triggers, procedures and functions.

### Item 4 - Mapping of backend tables to the UI
Open `database\docs\UI_TABLE_MAPPING.md`. One row per screen: the API it calls, the controller, the tables it reads or writes.

### Item 5 - Create / update / delete on every table
```
cmd /c "mysql -u ft_admin -p -h localhost fittrack_db < database\demo\03_crud_all_tables.sql"
```
Inserts, updates and deletes rows in all 10 tables, checks the rows, then deletes them again (children first).
The final line should show `leftover 0`. Every line is also in the file, so you can copy any single command into the notepad.

### Item 6 - Queries
```
cmd /c "mysql -u ft_admin -p -h localhost fittrack_db < database\queries.sql"
```
14 labelled queries: inner join, aggregates with GROUP BY and HAVING, subqueries (NOT IN and NOT EXISTS), a transaction with rollback,
a correlated subquery, two CTEs (`WITH` and `WITH RECURSIVE`), ORDER BY with LIMIT, window `RANK()`, the view, and `EXPLAIN` showing the index.

### Item 7 - Trigger and procedure, data before and after
Reset first (only needed after a previous run):
```
cmd /c "mysql -u ft_admin -p -h localhost fittrack_db < database\demo\00_reset_for_rehearsal.sql"
```
Trigger:
```
cmd /c "mysql -u ft_admin -p -h localhost --force fittrack_db < database\demo\04_trigger_before_after.sql"
```
- **Before:** Meera's weekly goal (target 2) is `active`, and her session 3 is still open.
- **After:** one `UPDATE` on the session. The goal becomes `completed`, and two rows appear in `activity_log`.
- The last statement is refused by the second trigger ("Session is already finished"). That error is expected.

Procedure and function:
```
cmd /c "mysql -u ft_admin -p -h localhost --force fittrack_db < database\demo\05_procedure_function.sql"
```
The function returns session 1's volume (3680 kg). The procedure promotes Ravi to admin and reverts it, and each change is written to `role_audit_log`.
The last-admin refusal is expected.

**Why this trigger is specific to FitTrack:** it implements the fitness rule "a workout counts toward a weekly goal once it is finished,
and the goal completes when the target is reached". It is not a generic audit trigger. The API's goal progress uses the same rule.

### Item 8 - One complex nested query
```
cmd /c "mysql -u ft_admin -p -h localhost fittrack_db < database\demo\07_nested_query.sql"
```
Members who have an active goal and whose average session volume is above the gym-wide average. Three levels of nesting plus an `EXISTS`.
Expected result: Demo User, average 3680 kg.

### Item 9 - Redis (Memurai) create, read, update, delete
```
cmd /c "redis-cli -h 127.0.0.1 -p 6379 < database\demo\08_redis_crud.txt"
```
Creates a journal entry (string JSON), a daily activity hash and a sensor stream entry. Then reads, updates (`SET ... XX`, `HINCRBY`) and deletes them.
The commands are plain lines, so you can paste them one by one.

Redis role-based access (item 9b, Git Bash):
```
export REDIS_MEMBER_PASSWORD='the value from your .env'
bash database/demo/09_redis_acl.sh
```
The member user can write its own journal keys. It gets `NOPERM` on other keys and on `FLUSHALL`/`KEYS`.

### Item 10 - Modifications
The database is rebuilt in one command (`node database\setup_mysql.js`). Each part is a separate file, so changes are quick to make.

---

## 3. Role-based access in the database (rubric: at least 2 roles)

```
cmd /c "mysql -u ft_member -p -h localhost --force fittrack_db < database\demo\06_rbac_member_denied.sql"
```
As the member account:
- **allowed:** reading names and roles, reading sets, and editing its own working data
- **denied:** `SELECT * FROM users` and `password_hash`, deleting an exercise, changing a role, calling `sp_change_role`, reading the audit log, `DROP TABLE`

The two database roles are `fittrack_admin` and `fittrack_member` (`database/security/roles.sql`). The accounts are created by `database/security/create_db_accounts.js`.

---

## 4. Rubric coverage (50 marks)

| Rubric item | Marks | Where to show it |
|---|---|---|
| ER diagram | 2 | `database/docs/er_diagram.png` |
| Relational schema with keys and constraints | 3 | `database/docs/RELATIONAL_SCHEMA.md`, demo 02 |
| SQL DDL with constraints | 4 | `database/schema.sql` (PK, FK, CHECK, UNIQUE, INDEX), `ALTER` in `backend/src/config/ensureSchema.js`, `DROP ... IF EXISTS` in `programmability.sql` |
| NoSQL / Memurai creation | 4 | `database/docs/RELATIONAL_SCHEMA.md` section 7, `database/memurai_setup.js` |
| Technology justification | 1 | `database/docs/RELATIONAL_SCHEMA.md` section 6 (why MySQL + Memurai) |
| DML operations | 4 | demo 03 (all tables), `queries.sql` |
| Nested / correlated / recursive queries, joins | 4 | `queries.sql` 8, 9, 11; demo 07 |
| Procedure / function, trigger, CTE | 6 | `programmability.sql`; demo 04, 05; `queries.sql` 10, 11 |
| NoSQL feature RUD | 7 | demo 08 (and 09) |
| Next.js interface | 3 | `frontend/src/app/` - App Router routes, shared signed-in layout, client-side role guard |
| Backend / API and DB integration | 2 | Next.js calls the Express API (`frontend/src/api.js`), `backend/src/controllers/*`, `database/docs/UI_TABLE_MAPPING.md` |
| Authentication, min. 2 roles, role-based access in DB | 4 | `users.role`, `requireRole`, demo 06, `database/security/roles.sql` |
| Documentation, Git/GitHub | 2 | this guide, `README.md`, `database/docs/`, git history |
| Originality, individual contribution, viva | 4 | be ready to explain each trigger, the procedure and the role grants |

---

## 5. Security notes

- `.env` is git-ignored; `.env.example` holds placeholders only. The backend exits at startup if a required secret is missing.
- Database accounts (`ft_admin`, `ft_member`) and the Redis member user take their passwords from `.env` or from your shell only.
- Passwords in the database are bcrypt hashes. `show_users.js` shows only the first characters of the hash.
- Row ownership (a member editing only their own rows) is enforced by the API. MySQL has no built-in row-level security.
