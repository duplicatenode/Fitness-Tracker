-- DEMO 7 - trigger: data BEFORE and AFTER the trigger fires.
-- Story: Meera (user 4) has a weekly goal of 2 finished workouts.
-- She has one finished session and one still in progress (session 3).
-- Finishing session 3 fires trg_session_finished: the goal is completed and two log rows are written.
-- Reset first with 00_reset_for_rehearsal.sql if you have already shown it once.
-- Run:  mysql -u ft_admin -p -h localhost fittrack_db < database/demo/04_trigger_before_after.sql
USE fittrack_db;

SELECT '1 BEFORE - goal'      AS stage, id, goal_type, target_value, status FROM fitness_goals WHERE id = 3;
SELECT '1 BEFORE - sessions'  AS stage, id, start_time, end_time, notes FROM workout_sessions WHERE user_id = 4;
SELECT '1 BEFORE - log rows'  AS stage, id, event_type, message FROM activity_log WHERE user_id = 4;

-- the action: finish the open session. Nothing else is done by the application.
UPDATE workout_sessions SET end_time = NOW() WHERE id = 3 AND end_time IS NULL;

SELECT '2 AFTER - goal'       AS stage, id, goal_type, target_value, status FROM fitness_goals WHERE id = 3;
SELECT '2 AFTER - sessions'   AS stage, id, start_time, end_time, notes FROM workout_sessions WHERE user_id = 4;
SELECT '2 AFTER - log rows'   AS stage, id, event_type, message FROM activity_log WHERE user_id = 4;

-- second trigger: trg_sets_locked_session refuses new sets on a finished session.
-- EXPECTED TO FAIL with "Session is already finished - sets can no longer be logged".
INSERT INTO workout_sets (session_id, exercise_id, set_number, reps, weight, completed)
VALUES (3, 1, 1, 8, 60.00, TRUE);
