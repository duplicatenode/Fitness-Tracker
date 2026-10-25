-- =====================================================================
-- FitTrack - demo seed data. Idempotent (INSERT IGNORE on explicit ids / unique keys).
--
-- Accounts created here (passwords are stored ONLY as bcrypt hashes):
--   id 1  Demo User     demo@fittrack.com    FitTrackDemo123!   role = member
--   id 2  Asha Admin    admin@fittrack.com   Admin@2026         role = admin
--   id 3  Ravi Kumar    ravi@fittrack.com    Member@2026        role = member
--   id 4  Meera Nair    meera@fittrack.com   Member@2026        role = member  (trigger demo)
-- =====================================================================
USE fittrack_db;

-- ---- Users (3 roles of data: members + one admin) ------------------
INSERT IGNORE INTO users (id, name, email, password_hash, role) VALUES
(1, 'Demo User',  'demo@fittrack.com',  '$2b$10$uN4lve2W8Ex753KQKpAJp.jVmAFzAN7wMDrlYU7LwIA9IGfNlaHOO', 'member'),
(2, 'Asha Admin', 'admin@fittrack.com', '$2b$10$d.JJVUS9ft/6JeKgvcjncuoblfkeASPC26R71OV56AAVQzL3J2quK', 'admin'),
(3, 'Ravi Kumar', 'ravi@fittrack.com',  '$2b$10$qdQoM1jDfVsTF7EpIUShtO1aCD3AY/f1PlBAgyDwLn1LKim0Ir4l2', 'member'),
(4, 'Meera Nair', 'meera@fittrack.com', '$2b$10$qdQoM1jDfVsTF7EpIUShtO1aCD3AY/f1PlBAgyDwLn1LKim0Ir4l2', 'member');

-- ---- User profiles (1:1 with users) --------------------------------
INSERT IGNORE INTO user_profiles (user_id, date_of_birth, gender, height_cm, weight_kg, fitness_level) VALUES
(1, '1995-04-12', 'male',   178.0, 80.0, 'intermediate'),
(2, '1990-01-30', 'female', 165.0, 62.0, 'advanced'),
(3, '2002-08-19', 'male',   175.0, 78.0, 'beginner'),
(4, '1998-11-03', 'female', 160.0, 55.0, 'intermediate');

-- ---- Exercise catalogue (shared, not user-owned) ------------------
INSERT IGNORE INTO exercises (id, name, description, muscle_group, equipment_needed) VALUES
(1, 'Bench Press',    'Lying on a bench and pressing weight upwards', 'Chest', 'Barbell'),
(2, 'Squat',          'Bending the knees and hips to lower the torso', 'Legs', 'Barbell'),
(3, 'Deadlift',       'Lifting a loaded barbell off the ground', 'Back', 'Barbell'),
(4, 'Pull-up',        'Pulling the body up to a bar', 'Back', 'Bodyweight'),
(5, 'Treadmill Run',  'Running at a steady pace', 'Cardio', 'Treadmill'),
(6, 'Overhead Press', 'Pressing a barbell from shoulder height to overhead', 'Shoulders', 'Barbell'),
(7, 'Lunges',         'Stepping forward and lowering the back knee', 'Legs', 'Bodyweight');

-- ---- Workout plans -------------------------------------------------
INSERT IGNORE INTO workout_plans (id, user_id, name, description) VALUES
(1, 1, 'Full Body Strength', 'A balanced 3-day full body routine.'),
(2, 4, 'Lower Body Builder', 'Leg-focused plan, three sessions a week.'),
(3, 3, 'Cardio Starter',      'Beginner treadmill intervals.');

-- Plan exercises (explicit ids so re-running the seed does not duplicate rows)
INSERT IGNORE INTO plan_exercises (id, plan_id, exercise_id, sets, reps, rest_seconds, exercise_order) VALUES
(1, 1, 2, 4, 8, 90, 1),   -- Full Body: Squat
(2, 1, 1, 4, 8, 90, 2),   -- Full Body: Bench Press
(3, 1, 4, 3, 10, 60, 3),  -- Full Body: Pull-up
(4, 2, 2, 4, 6, 120, 1),  -- Lower Body: Squat
(5, 2, 7, 3, 12, 60, 2),  -- Lower Body: Lunges
(6, 3, 5, 5, 1, 60, 1);   -- Cardio: Treadmill intervals

-- ---- Workout sessions -----------------------------------------------
-- Sessions are created OPEN (end_time NULL) so sets can be logged; they are finished below.
-- trg_sets_locked_session forbids logging sets into a finished session, so this order matters.
INSERT IGNORE INTO workout_sessions (id, user_id, plan_id, start_time, end_time, notes) VALUES
(1, 1, 1, DATE_SUB(NOW(), INTERVAL 1 DAY),  NULL, 'Felt strong today.'),
(2, 4, 2, DATE_SUB(NOW(), INTERVAL 3 HOUR), NULL, 'Solid leg day.'),
(3, 4, 2, DATE_SUB(NOW(), INTERVAL 10 MINUTE), NULL, 'In progress - finished live in the demo.'),
(4, 3, 3, DATE_SUB(NOW(), INTERVAL 2 DAY),  NULL, 'Treadmill intervals.');

-- Sets. Each row is inserted only if it is missing, so the trigger on finished sessions
-- never fires on a re-run of this seed.
INSERT INTO workout_sets (session_id, exercise_id, set_number, reps, weight, completed)
SELECT v.sid, v.eid, v.sn, v.rp, v.w, TRUE
FROM (
    SELECT 1 AS sid, 2 AS eid, 1 AS sn,  8 AS rp, 135.00 AS w UNION ALL
    SELECT 1, 2, 2,  8, 135.00 UNION ALL
    SELECT 1, 1, 1,  8,  95.00 UNION ALL
    SELECT 1, 1, 2,  8,  95.00 UNION ALL
    SELECT 2, 2, 1,  6, 100.00 UNION ALL
    SELECT 2, 2, 2,  6, 100.00 UNION ALL
    SELECT 2, 7, 1, 12,   0.00 UNION ALL
    SELECT 4, 5, 1,  1,   0.00
) v
WHERE NOT EXISTS (
    SELECT 1 FROM workout_sets x
    WHERE x.session_id = v.sid AND x.exercise_id = v.eid AND x.set_number = v.sn
);

-- Finish the sessions that are already over (fires trg_session_finished -> activity_log)
UPDATE workout_sessions SET end_time = DATE_SUB(NOW(), INTERVAL 23 HOUR) WHERE id = 1 AND end_time IS NULL;
UPDATE workout_sessions SET end_time = DATE_SUB(NOW(), INTERVAL 2 HOUR)  WHERE id = 2 AND end_time IS NULL;
UPDATE workout_sessions SET end_time = DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 40 MINUTE WHERE id = 4 AND end_time IS NULL;
-- Session 3 is deliberately LEFT OPEN for the trigger demo.

-- ---- Fitness goals --------------------------------------------------
INSERT IGNORE INTO fitness_goals (id, user_id, goal_type, target_value, start_date, deadline, status) VALUES
(1, 1, 'weekly_workouts', 3, DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'active'),
(2, 1, 'daily_steps', 8000, CURDATE(), NULL, 'active'),
(3, 4, 'weekly_workouts', 2, DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY), 'active'),
(4, 3, 'daily_calories', 500, CURDATE(), NULL, 'active');
