-- DEMO 2 / 3 - the tables, their keys and constraints (what the ER diagram turns into)
-- Run:  mysql -u ft_admin -p -h localhost fittrack_db < database/demo/02_schema_inspection.sql
USE fittrack_db;

SHOW FULL TABLES WHERE Table_type = 'BASE TABLE';
SHOW FULL TABLES WHERE Table_type = 'VIEW';

-- primary and foreign keys
SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'fittrack_db' AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- CHECK and UNIQUE constraints
SELECT TABLE_NAME, CONSTRAINT_NAME, CONSTRAINT_TYPE
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = 'fittrack_db' AND CONSTRAINT_TYPE IN ('CHECK', 'UNIQUE')
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- the stored programs
SHOW TRIGGERS FROM fittrack_db;
SHOW PROCEDURE STATUS WHERE Db = 'fittrack_db';
SHOW FUNCTION STATUS WHERE Db = 'fittrack_db';

-- full DDL of one table (shows PK, FK, CHECK, INDEX definitions)
SHOW CREATE TABLE workout_sets\G
