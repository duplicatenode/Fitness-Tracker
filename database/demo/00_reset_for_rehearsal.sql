-- Put the demo data back to its starting point so 04_trigger_before_after.sql can be shown again.
-- Run as ft_admin or root:  mysql -u ft_admin -p -h localhost fittrack_db < database/demo/00_reset_for_rehearsal.sql
USE fittrack_db;
DELETE FROM activity_log WHERE user_id = 4 AND (event_type = 'GOAL_COMPLETED' OR message = 'Session #3 finished');
UPDATE fitness_goals SET status = 'active' WHERE id = 3;
UPDATE workout_sessions SET end_time = NULL, notes = 'In progress - finished live in the demo.' WHERE id = 3;
SELECT 'reset done' AS status, (SELECT status FROM fitness_goals WHERE id = 3) AS goal_3_status,
       (SELECT end_time FROM workout_sessions WHERE id = 3) AS session_3_end;
