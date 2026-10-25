-- =====================================================================
-- FitTrack - stored programs: triggers, procedure, function, views.
-- Run after schema.sql.  Idempotent (DROP ... IF EXISTS before CREATE).
--   mysql -u root -p < database/programmability.sql
-- (node database/setup_mysql.js also runs this file.)
-- =====================================================================
USE fittrack_db;

DELIMITER $$

-- ---------------------------------------------------------------------
-- DROP demonstration + VIEW: member-facing session summary
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS v_session_summary$$
DROP VIEW IF EXISTS v_user_directory$$

-- ---------------------------------------------------------------------
-- FUNCTION: total lifted volume (kg x reps) of the completed sets in one session
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_session_volume$$
CREATE FUNCTION fn_session_volume(p_session_id INT) RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(12,2);
    SELECT COALESCE(SUM(reps * weight), 0) INTO v_total
    FROM workout_sets
    WHERE session_id = p_session_id AND completed = TRUE;
    RETURN v_total;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 1 (BEFORE INSERT on workout_sets)
-- Business rule: once a workout is finished it is locked - no more sets can be logged.
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_sets_locked_session$$
CREATE TRIGGER trg_sets_locked_session
BEFORE INSERT ON workout_sets
FOR EACH ROW
BEGIN
    DECLARE v_end DATETIME;
    SELECT end_time INTO v_end FROM workout_sessions WHERE id = NEW.session_id;
    IF v_end IS NOT NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Session is already finished - sets can no longer be logged';
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 2 (AFTER UPDATE on workout_sessions)  - FitTrack goal engine
-- When a session is finished (end_time NULL -> set):
--   1. writes a SESSION_FINISHED row to activity_log
--   2. every ACTIVE weekly_workouts goal of that user whose target is now reached
--      (counting FINISHED sessions inside the goal window) is marked 'completed'
--      and a GOAL_COMPLETED row is written to activity_log
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_session_finished$$
CREATE TRIGGER trg_session_finished
AFTER UPDATE ON workout_sessions
FOR EACH ROW
BEGIN
    IF OLD.end_time IS NULL AND NEW.end_time IS NOT NULL THEN
        INSERT INTO activity_log (user_id, event_type, message)
        VALUES (NEW.user_id, 'SESSION_FINISHED', CONCAT('Session #', NEW.id, ' finished'));

        INSERT INTO activity_log (user_id, event_type, message)
        SELECT g.user_id, 'GOAL_COMPLETED',
               CONCAT('Goal #', g.id, ' reached: ', g.target_value, ' ', g.goal_type, ' completed')
        FROM fitness_goals g
        WHERE g.user_id = NEW.user_id
          AND g.status = 'active'
          AND g.goal_type = 'weekly_workouts'
          AND (SELECT COUNT(*) FROM workout_sessions s
               WHERE s.user_id = g.user_id
                 AND s.end_time IS NOT NULL
                 AND s.start_time >= g.start_date
                 AND (g.deadline IS NULL OR s.start_time < DATE_ADD(g.deadline, INTERVAL 1 DAY))
              ) >= g.target_value;

        UPDATE fitness_goals g
        SET g.status = 'completed'
        WHERE g.user_id = NEW.user_id
          AND g.status = 'active'
          AND g.goal_type = 'weekly_workouts'
          AND (SELECT COUNT(*) FROM workout_sessions s
               WHERE s.user_id = g.user_id
                 AND s.end_time IS NOT NULL
                 AND s.start_time >= g.start_date
                 AND (g.deadline IS NULL OR s.start_time < DATE_ADD(g.deadline, INTERVAL 1 DAY))
              ) >= g.target_value;
    END IF;
END$$

-- ---------------------------------------------------------------------
-- PROCEDURE: change a user's application role, enforced INSIDE the database.
--   * the caller (p_actor_id) must currently be an admin
--   * the last remaining admin cannot be demoted
--   * every change is written to role_audit_log
-- Execute privilege is granted only to the fittrack_admin role (security/roles.sql).
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_change_role$$
CREATE PROCEDURE sp_change_role(IN p_actor_id INT, IN p_target_id INT, IN p_new_role VARCHAR(10))
BEGIN
    DECLARE v_is_admin INT DEFAULT 0;
    DECLARE v_exists INT DEFAULT 0;
    DECLARE v_admins INT DEFAULT 0;
    DECLARE v_old_role VARCHAR(10);

    SELECT COUNT(*) INTO v_is_admin FROM users WHERE id = p_actor_id AND role = 'admin';
    IF v_is_admin = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Permission denied: only an admin can change roles';
    END IF;

    IF p_new_role NOT IN ('admin', 'member') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid role: use admin or member';
    END IF;

    SELECT COUNT(*) INTO v_exists FROM users WHERE id = p_target_id;
    IF v_exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Target user does not exist';
    END IF;

    SELECT role INTO v_old_role FROM users WHERE id = p_target_id;
    IF v_old_role = 'admin' AND p_new_role = 'member' THEN
        SELECT COUNT(*) INTO v_admins FROM users WHERE role = 'admin';
        IF v_admins <= 1 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot demote the last remaining admin';
        END IF;
    END IF;

    UPDATE users SET role = p_new_role WHERE id = p_target_id;
    INSERT INTO role_audit_log (actor_id, target_user_id, old_role, new_role)
    VALUES (p_actor_id, p_target_id, v_old_role, p_new_role);
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- VIEWS (no DELIMITER needed - single statements)
-- ---------------------------------------------------------------------
CREATE VIEW v_user_directory AS
SELECT u.id, u.name, u.email, u.role, u.created_at, u.last_login_at,
       p.gender, p.fitness_level,
       (SELECT COUNT(*) FROM workout_sessions s WHERE s.user_id = u.id) AS sessions,
       (SELECT COUNT(*) FROM fitness_goals g WHERE g.user_id = u.id AND g.status = 'active') AS active_goals
FROM users u
LEFT JOIN user_profiles p ON p.user_id = u.id;

CREATE VIEW v_session_summary AS
SELECT s.id AS session_id, s.user_id, u.name AS member_name, pl.name AS plan_name,
       s.start_time, s.end_time,
       TIMESTAMPDIFF(MINUTE, s.start_time, s.end_time) AS duration_min,
       fn_session_volume(s.id) AS volume_kg
FROM workout_sessions s
JOIN users u ON u.id = s.user_id
LEFT JOIN workout_plans pl ON pl.id = s.plan_id;
