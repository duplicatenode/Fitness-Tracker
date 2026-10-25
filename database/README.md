# FitTrack Database

Hybrid design: **MySQL** for structured, related, transactional data and **Memurai** (Redis protocol) for high-volume or flexible data.

## Files
| File | Purpose |
|---|---|
| `schema.sql` | tables, primary/foreign keys, CHECK, UNIQUE and index definitions (fresh install) |
| `programmability.sql` | 2 triggers, 1 procedure, 1 function, 2 views (idempotent, uses `DELIMITER`) |
| `seed.sql` | demo users with roles, profiles, exercises, plans, sessions, sets, goals |
| `security/roles.sql` | database roles `fittrack_admin` and `fittrack_member` and their grants |
| `security/create_db_accounts.js` | creates `ft_admin` / `ft_member` and binds them to the roles (passwords from `.env`) |
| `sqlRunner.js` | runs `.sql` files statement by statement, honouring `DELIMITER` |
| `setup_mysql.js` | full build: schema, programmability, seed, roles and accounts |
| `migrate.js` | upgrades an existing database in place |
| `queries.sql` | the important queries (joins, aggregates, subqueries, CTEs, views, index plan) |
| `demo/` | one script per demo item (see `../DEMO_GUIDE.md`) |
| `docs/` | ER diagram (`er_diagram.png`, `.mmd`, `.svg`), `RELATIONAL_SCHEMA.md`, `UI_TABLE_MAPPING.md` |
| `show_users.js` | lists users, roles and profiles |
| `memurai_setup.js` | connection test and sample writes for Memurai |

## Build
```
node database/setup_mysql.js
```
(needs `DB_USER`, `DB_PASSWORD`, `DB_ADMIN_PASSWORD`, `DB_MEMBER_PASSWORD` in `.env`)

## Memurai key design
| Key | Type | Notes |
|---|---|---|
| `fittrack:sensors:{userId}` | Stream | append-only wearable readings |
| `fittrack:activity:daily:{userId}:{YYYY-MM-DD}` | Hash | daily totals, updated often |
| `fittrack:journal:{userId}:{id}` | String (JSON) | flexible journal entries |
| `fittrack:photos:{userId}:{id}` | String (JSON) | photo metadata (no image files) |
