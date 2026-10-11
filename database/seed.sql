USE fittrack_db;

-- Insert Demo User (Idempotent: uses INSERT IGNORE based on unique email)
-- Password hash is for 'FitTrackDemo123!' (using bcrypt, this is a valid hash for it)
INSERT IGNORE INTO users (id, name, email, password_hash) 
VALUES (1, 'Demo User', 'demo@fittrack.com', '$2b$10$uN4lve2W8Ex753KQKpAJp.jVmAFzAN7wMDrlYU7LwIA9IGfNlaHOO');

-- Insert Core Exercises
INSERT IGNORE INTO exercises (id, name, description, muscle_group, equipment_needed) VALUES 
(1, 'Bench Press', 'Lying on a bench and pressing weight upwards', 'Chest', 'Barbell'),
(2, 'Squat', 'Bending the knees and hips to lower the torso', 'Legs', 'Barbell'),
(3, 'Deadlift', 'Lifting a loaded barbell off the ground', 'Back', 'Barbell'),
(4, 'Pull-up', 'Pulling the body up to a bar', 'Back', 'Bodyweight'),
(5, 'Treadmill Run', 'Running at a steady pace', 'Cardio', 'Treadmill');

-- Insert Demo Workout Plan
INSERT IGNORE INTO workout_plans (id, user_id, name, description) 
VALUES (1, 1, 'Full Body Strength', 'A balanced 3-day full body routine.');

-- Link Exercises to Plan
INSERT IGNORE INTO plan_exercises (plan_id, exercise_id, sets, reps, rest_seconds, exercise_order) VALUES 
(1, 2, 4, 8, 90, 1),  -- Squat
(1, 1, 4, 8, 90, 2),  -- Bench Press
(1, 4, 3, 10, 60, 3); -- Pull-up

-- Insert a Demo Workout Session
INSERT IGNORE INTO workout_sessions (id, user_id, plan_id, start_time, end_time, notes) 
VALUES (1, 1, 1, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 23 HOUR), 'Felt strong today.');

-- Log Sets for the Demo Session
INSERT IGNORE INTO workout_sets (session_id, exercise_id, set_number, reps, weight, completed) VALUES 
(1, 2, 1, 8, 135.00, TRUE),
(1, 2, 2, 8, 135.00, TRUE),
(1, 1, 1, 8, 95.00, TRUE),
(1, 1, 2, 8, 95.00, TRUE);

-- Insert Demo Goal
INSERT IGNORE INTO fitness_goals (id, user_id, goal_type, target_value, start_date, deadline, status) 
VALUES (1, 1, 'weekly_workouts', 3, DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'active');
