-- =====================================================================
-- FitTrack - DATABASE-LEVEL role-based access control (RBAC)
--
-- Two database roles. Accounts are created in security/create_db_accounts.js
-- (their passwords come from .env, never from this file).
--
--   fittrack_admin   : full control of fittrack_db (tables, views, triggers,
--                      procedures, EXECUTE on sp_change_role, audit log)
--   fittrack_member  : READ the app data it needs (never password hashes, never the
--                      audit log) and WRITE only its own working data (plans, sessions,
--                      sets, goals, profile). It cannot delete users, change roles,
--                      edit the exercise catalogue, or call sp_change_role.
-- Re-runnable: the roles are dropped and rebuilt, then the accounts are re-bound.
-- =====================================================================

DROP ROLE IF EXISTS 'fittrack_admin', 'fittrack_member';
CREATE ROLE 'fittrack_admin';
CREATE ROLE 'fittrack_member';

-- ---- Admin ----------------------------------------------------------
GRANT ALL PRIVILEGES ON fittrack_db.* TO 'fittrack_admin';

-- ---- Member: READ only what the app shows ----------------------------
GRANT SELECT ON fittrack_db.exercises        TO 'fittrack_member';
GRANT SELECT ON fittrack_db.workout_plans    TO 'fittrack_member';
GRANT SELECT ON fittrack_db.plan_exercises   TO 'fittrack_member';
GRANT SELECT ON fittrack_db.workout_sessions TO 'fittrack_member';
GRANT SELECT ON fittrack_db.workout_sets     TO 'fittrack_member';
GRANT SELECT ON fittrack_db.fitness_goals    TO 'fittrack_member';
GRANT SELECT ON fittrack_db.user_profiles    TO 'fittrack_member';
GRANT SELECT ON fittrack_db.activity_log     TO 'fittrack_member';
GRANT SELECT ON fittrack_db.v_session_summary TO 'fittrack_member';
-- column-level: no password_hash, no role changes visible to a member's SELECT *
GRANT SELECT (id, name, email, role, created_at, last_login_at) ON fittrack_db.users TO 'fittrack_member';

-- ---- Member: WRITE only own working data ------------------------------
GRANT INSERT, UPDATE, DELETE ON fittrack_db.workout_plans    TO 'fittrack_member';
GRANT INSERT, UPDATE, DELETE ON fittrack_db.plan_exercises   TO 'fittrack_member';
GRANT INSERT, UPDATE, DELETE ON fittrack_db.workout_sessions TO 'fittrack_member';
GRANT INSERT, UPDATE, DELETE ON fittrack_db.workout_sets     TO 'fittrack_member';
GRANT INSERT, UPDATE, DELETE ON fittrack_db.fitness_goals    TO 'fittrack_member';
GRANT INSERT, UPDATE         ON fittrack_db.user_profiles    TO 'fittrack_member';
-- a member may change only their display name and last-login time
GRANT UPDATE (name, last_login_at) ON fittrack_db.users      TO 'fittrack_member';
