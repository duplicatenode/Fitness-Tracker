-- DEMO 1 - How many users are in the database, and which role does each one have?
-- Run:  mysql -u ft_admin -p -h localhost fittrack_db < database/demo/01_users_and_roles.sql
USE fittrack_db;

SELECT COUNT(*) AS total_users FROM users;

SELECT role, COUNT(*) AS users_in_role FROM users GROUP BY role;

-- every user with role and profile (the same view the Admin page in the app reads)
SELECT id, name, email, role, gender, fitness_level, sessions, active_goals
FROM v_user_directory
ORDER BY id;

-- database-level role that the account you are logged in with is bound to
SELECT CURRENT_USER() AS account, CURRENT_ROLE() AS active_role;
SHOW GRANTS FOR CURRENT_USER();
