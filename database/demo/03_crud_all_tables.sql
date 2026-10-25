-- DEMO 5 - INSERT, UPDATE and DELETE on EVERY table.
-- Uses the id range 900+ so it never touches the real demo data.
-- The rows are removed again at the end (children first, so foreign keys are respected).
-- Run:  mysql -u ft_admin -p -h localhost fittrack_db < database/demo/03_crud_all_tables.sql
USE fittrack_db;

-- ===================== users =====================
INSERT INTO users (id, name, email, password_hash, role) VALUES
(900, 'CRUD Trainee', 'crud.test@fittrack.com', '$2b$10$qdQoM1jDfVsTF7EpIUShtO1aCD3AY/f1PlBAgyDwLn1LKim0Ir4l2', 'member');
UPDATE users SET name = 'CRUD Trainee (edited)' WHERE id = 900;

-- ===================== user_profiles =====================
INSERT INTO user_profiles (user_id, date_of_birth, gender, height_cm, weight_kg, fitness_level)
VALUES (900, '2000-06-15', 'non_binary', 170.0, 70.0, 'beginner');
UPDATE user_profiles SET weight_kg = 68.5 WHERE user_id = 900;

-- ===================== exercises =====================
INSERT INTO exercises (id, name, description, muscle_group, equipment_needed)
VALUES (900, 'CRUD Test Exercise', 'temporary row', 'Core', 'Bodyweight');
UPDATE exercises SET description = 'temporary row (edited)' WHERE id = 900;

-- ===================== workout_plans =====================
INSERT INTO workout_plans (id, user_id, name, description) VALUES (900, 900, 'CRUD Plan', 'temporary plan');
UPDATE workout_plans SET name = 'CRUD Plan (edited)' WHERE id = 900;

-- ===================== plan_exercises =====================
INSERT INTO plan_exercises (id, plan_id, exercise_id, sets, reps, target_weight, rest_seconds, exercise_order)
VALUES (900, 900, 900, 3, 10, 20.00, 60, 1);
UPDATE plan_exercises SET sets = 4 WHERE id = 900;

-- ===================== workout_sessions =====================
INSERT INTO workout_sessions (id, user_id, plan_id, start_time, notes)
VALUES (900, 900, 900, NOW(), 'CRUD session (still open)');
UPDATE workout_sessions SET notes = 'CRUD session (edited)' WHERE id = 900;

-- ===================== workout_sets =====================
-- allowed because session 900 is still open (trigger trg_sets_locked_session)
INSERT INTO workout_sets (id, session_id, exercise_id, set_number, reps, weight, completed)
VALUES (900, 900, 900, 1, 10, 20.00, TRUE);
UPDATE workout_sets SET reps = 12 WHERE id = 900;

-- ===================== fitness_goals =====================
INSERT INTO fitness_goals (id, user_id, goal_type, target_value, start_date, deadline, status)
VALUES (900, 900, 'daily_calories', 400, CURDATE(), NULL, 'active');
UPDATE fitness_goals SET target_value = 450 WHERE id = 900;

-- ===================== activity_log =====================
INSERT INTO activity_log (id, user_id, event_type, message)
VALUES (900, 900, 'SESSION_FINISHED', 'manual CRUD row');
UPDATE activity_log SET message = 'manual CRUD row (edited)' WHERE id = 900;

-- ===================== role_audit_log =====================
INSERT INTO role_audit_log (id, actor_id, target_user_id, old_role, new_role)
VALUES (900, 2, 900, 'member', 'admin');
UPDATE role_audit_log SET new_role = 'member' WHERE id = 900;   -- normally append-only; shown for CRUD completeness

-- ===================== verify, then DELETE in child-first order =====================
SELECT 'users' t, COUNT(*) rows_900 FROM users WHERE id = 900
UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles WHERE user_id = 900
UNION ALL SELECT 'exercises', COUNT(*) FROM exercises WHERE id = 900
UNION ALL SELECT 'workout_plans', COUNT(*) FROM workout_plans WHERE id = 900
UNION ALL SELECT 'plan_exercises', COUNT(*) FROM plan_exercises WHERE id = 900
UNION ALL SELECT 'workout_sessions', COUNT(*) FROM workout_sessions WHERE id = 900
UNION ALL SELECT 'workout_sets', COUNT(*) FROM workout_sets WHERE id = 900
UNION ALL SELECT 'fitness_goals', COUNT(*) FROM fitness_goals WHERE id = 900
UNION ALL SELECT 'activity_log', COUNT(*) FROM activity_log WHERE id = 900
UNION ALL SELECT 'role_audit_log', COUNT(*) FROM role_audit_log WHERE id = 900;

DELETE FROM role_audit_log   WHERE id = 900;
DELETE FROM activity_log     WHERE id = 900;
DELETE FROM workout_sets     WHERE id = 900;
DELETE FROM workout_sessions WHERE id = 900;
DELETE FROM plan_exercises   WHERE id = 900;
DELETE FROM workout_plans    WHERE id = 900;
DELETE FROM exercises        WHERE id = 900;
DELETE FROM fitness_goals    WHERE id = 900;
DELETE FROM user_profiles    WHERE user_id = 900;
DELETE FROM users            WHERE id = 900;

SELECT 'after delete - rows left for id 900' AS check_step,
       (SELECT COUNT(*) FROM users WHERE id = 900) + (SELECT COUNT(*) FROM exercises WHERE id = 900) AS leftover;
