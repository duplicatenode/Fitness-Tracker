-- DEMO 9 - database-level role-based access control.
-- Run as the MEMBER account. Some lines are EXPECTED to be denied.
-- Use --force so the script continues after each denial:
--   mysql -u ft_member -p -h localhost --force fittrack_db < database/demo/06_rbac_member_denied.sql
USE fittrack_db;

SELECT 'ALLOWED  read names and roles'          AS expectation, id, name, role FROM users;
SELECT 'ALLOWED  read workout sets'             AS expectation, COUNT(*) AS sets FROM workout_sets;
UPDATE workout_sessions SET notes = 'edited by a member account' WHERE id = 1;   -- own working data

SELECT * FROM users;                                  -- DENIED: password_hash is not readable
SELECT password_hash FROM users;                      -- DENIED: column privilege
DELETE FROM exercises WHERE id = 7;                   -- DENIED: catalogue is read-only
UPDATE users SET role = 'admin' WHERE id = 1;         -- DENIED: members cannot change roles
CALL sp_change_role(1, 1, 'admin');                   -- DENIED: no EXECUTE privilege
SELECT * FROM role_audit_log;                         -- DENIED: audit log is admin-only
DROP TABLE exercises;                                 -- DENIED: no DDL rights
