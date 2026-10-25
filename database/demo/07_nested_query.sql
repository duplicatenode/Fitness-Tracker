-- DEMO 8 - ONE complex, nested query.
-- "Members who have an ACTIVE goal AND whose average session volume is above the gym-wide average."
--   level 1  scalar subquery      : average volume across all finished sessions
--   level 2  derived table        : each user's average volume (built on fn_session_volume)
--   level 3  derived table x      : per-session volume, the innermost input
--   plus an EXISTS (correlated) check on fitness_goals.
-- Run:  mysql -u ft_admin -p -h localhost fittrack_db < database/demo/07_nested_query.sql
USE fittrack_db;

SELECT u.id, u.name, ROUND(t.avg_volume_kg, 2) AS avg_volume_kg
FROM users u
JOIN (
    SELECT x.user_id, AVG(x.volume_kg) AS avg_volume_kg
    FROM (SELECT s.user_id, fn_session_volume(s.id) AS volume_kg
          FROM workout_sessions s
          WHERE s.end_time IS NOT NULL) x
    GROUP BY x.user_id
) t ON t.user_id = u.id
WHERE EXISTS (SELECT 1 FROM fitness_goals g WHERE g.user_id = u.id AND g.status = 'active')
  AND t.avg_volume_kg > (SELECT AVG(y.volume_kg)
                         FROM (SELECT fn_session_volume(s2.id) AS volume_kg
                               FROM workout_sessions s2
                               WHERE s2.end_time IS NOT NULL) y)
ORDER BY t.avg_volume_kg DESC;
