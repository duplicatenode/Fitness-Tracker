USE fittrack_db;

-- 1. JOIN Query: Get a user's workout sessions with plan names
SELECT s.id, s.start_time, p.name AS plan_name, s.notes
FROM workout_sessions s
JOIN workout_plans p ON s.plan_id = p.id
WHERE s.user_id = 1;

-- 2. Aggregate Query (COUNT, SUM): Total volume lifted in a session
SELECT session_id, COUNT(id) AS total_sets, SUM(reps * weight) AS total_volume
FROM workout_sets
WHERE session_id = 1 AND completed = TRUE
GROUP BY session_id;

-- 3. Subquery: Find exercises not currently in any workout plan
SELECT name, muscle_group 
FROM exercises 
WHERE id NOT IN (SELECT exercise_id FROM plan_exercises);

-- 4. Date-Range Query: Sessions in the last 7 days
SELECT id, start_time 
FROM workout_sessions 
WHERE user_id = 1 AND start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY);

-- 5. Transaction Example (Rollback demonstration)
START TRANSACTION;
INSERT INTO workout_sessions (user_id, plan_id, start_time) VALUES (1, 1, NOW());
-- Assume an error happens here (e.g., app crashes before inserting sets)
ROLLBACK;
-- The session is not saved.

-- 6. Users with their profile details (1:1 JOIN). Passwords are bcrypt hashes, never plain text.
SELECT u.id, u.name, u.email, u.created_at, u.last_login_at,
       p.date_of_birth, TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) AS age,
       p.gender, p.height_cm, p.weight_kg, p.fitness_level
FROM users u
LEFT JOIN user_profiles p ON p.user_id = u.id
ORDER BY u.id;

-- 7. Per-user activity summary (LEFT JOINs + GROUP BY)
SELECT u.id, u.name,
       COUNT(DISTINCT s.id) AS sessions,
       COUNT(DISTINCT g.id) AS goals,
       COUNT(DISTINCT w.id) AS plans
FROM users u
LEFT JOIN workout_sessions s ON s.user_id = u.id
LEFT JOIN fitness_goals g ON g.user_id = u.id
LEFT JOIN workout_plans w ON w.user_id = u.id
GROUP BY u.id, u.name;
