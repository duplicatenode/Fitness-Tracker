-- =====================================================================
-- FitTrack - important queries (run after setup_mysql.js)
--   mysql -u ft_admin -p -h localhost fittrack_db < database/queries.sql
-- Each block is labelled with the SQL concept it demonstrates.
-- =====================================================================
USE fittrack_db;

-- 1. JOIN (INNER): a user's finished sessions with the plan name
SELECT s.id, s.start_time, s.end_time, p.name AS plan_name, s.notes
FROM workout_sessions s
JOIN workout_plans p ON s.plan_id = p.id
WHERE s.user_id = 4
ORDER BY s.start_time DESC;

-- 2. AGGREGATE (COUNT, SUM, GROUP BY) + user-defined FUNCTION fn_session_volume
SELECT session_id, COUNT(id) AS total_sets, SUM(reps * weight) AS total_volume_kg
FROM workout_sets
WHERE session_id = 1 AND completed = TRUE
GROUP BY session_id;

SELECT id AS session_id, user_id, fn_session_volume(id) AS volume_kg
FROM workout_sessions
ORDER BY volume_kg DESC;

-- 3. SUBQUERY (NOT IN) and the same question with a correlated NOT EXISTS
SELECT name, muscle_group FROM exercises
WHERE id NOT IN (SELECT exercise_id FROM plan_exercises);

SELECT e.name, e.muscle_group FROM exercises e
WHERE NOT EXISTS (SELECT 1 FROM plan_exercises pe WHERE pe.exercise_id = e.id);

-- 4. DATE-RANGE query (WHERE with date arithmetic)
SELECT id, start_time FROM workout_sessions
WHERE user_id = 1 AND start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY);

-- 5. TRANSACTION (atomic: all or nothing) - the procedure-free equivalent of app registration
START TRANSACTION;
INSERT INTO workout_sessions (user_id, plan_id, start_time) VALUES (1, 1, NOW());
-- imagine the app crashes before the sets are written ...
ROLLBACK;                      -- the session row is NOT kept

-- 6. JOIN (1:1) users + profiles
SELECT u.id, u.name, u.email, u.role, u.last_login_at,
       p.date_of_birth, TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) AS age,
       p.gender, p.height_cm, p.weight_kg, p.fitness_level
FROM users u
LEFT JOIN user_profiles p ON p.user_id = u.id
ORDER BY u.id;

-- 7. GROUP BY + HAVING (only users who have logged at least one session)
SELECT u.id, u.name,
       COUNT(DISTINCT s.id) AS sessions,
       COUNT(DISTINCT g.id) AS goals,
       COUNT(DISTINCT w.id) AS plans
FROM users u
LEFT JOIN workout_sessions s ON s.user_id = u.id
LEFT JOIN fitness_goals g   ON g.user_id = u.id
LEFT JOIN workout_plans w   ON w.user_id = u.id
GROUP BY u.id, u.name
HAVING COUNT(DISTINCT s.id) >= 1
ORDER BY sessions DESC, u.name;

-- 8. NESTED query (3 levels): members with an ACTIVE goal whose average session volume
--    beats the average across ALL finished sessions.
SELECT u.id, u.name, t.avg_volume_kg
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

-- 9. CORRELATED subquery: sessions that beat that same user's own average session
SELECT s.id, s.user_id, fn_session_volume(s.id) AS volume_kg
FROM workout_sessions s
WHERE s.end_time IS NOT NULL
  AND fn_session_volume(s.id) > (SELECT AVG(fn_session_volume(s2.id))
                                 FROM workout_sessions s2
                                 WHERE s2.user_id = s.user_id AND s2.end_time IS NOT NULL);

-- 10. CTE (WITH): weekly-style leaderboard by total lifted volume
WITH session_volume AS (
    SELECT s.id AS session_id, s.user_id, SUM(ws.reps * ws.weight) AS volume_kg
    FROM workout_sessions s
    JOIN workout_sets ws ON ws.session_id = s.id AND ws.completed = TRUE
    GROUP BY s.id, s.user_id
),
user_totals AS (
    SELECT user_id, COUNT(*) AS sessions_with_sets, SUM(volume_kg) AS total_volume_kg
    FROM session_volume
    GROUP BY user_id
)
SELECT u.name, t.sessions_with_sets, t.total_volume_kg,
       RANK() OVER (ORDER BY t.total_volume_kg DESC) AS volume_rank
FROM user_totals t
JOIN users u ON u.id = t.user_id
ORDER BY volume_rank;

-- 11. RECURSIVE CTE: a calendar of the last 7 days, with finished sessions per day for user 4
WITH RECURSIVE calendar AS (
    SELECT CURDATE() - INTERVAL 6 DAY AS day
    UNION ALL
    SELECT day + INTERVAL 1 DAY FROM calendar WHERE day < CURDATE()
)
SELECT c.day, COUNT(s.id) AS finished_sessions
FROM calendar c
LEFT JOIN workout_sessions s
       ON DATE(s.start_time) = c.day AND s.user_id = 4 AND s.end_time IS NOT NULL
GROUP BY c.day
ORDER BY c.day;

-- 12. ORDER BY + LIMIT: the three most-trained exercises (completed sets)
SELECT e.name, e.muscle_group, COUNT(ws.id) AS completed_sets
FROM workout_sets ws
JOIN exercises e ON e.id = ws.exercise_id
WHERE ws.completed = TRUE
GROUP BY e.id, e.name, e.muscle_group
ORDER BY completed_sets DESC, e.name
LIMIT 3;

-- 13. VIEWS: the member-facing summaries are simple SELECTs
SELECT * FROM v_user_directory ORDER BY id;
SELECT * FROM v_session_summary ORDER BY session_id;

-- 14. INDEX usage: the composite index idx_user_sessions(user_id, start_time) is used here
EXPLAIN SELECT id, start_time FROM workout_sessions
WHERE user_id = 1 AND start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY);
