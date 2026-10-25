-- =====================================================================
-- FitTrack - relational schema (MySQL 8.0+ / MariaDB 10.2+)
-- Idempotent: safe to run again (CREATE ... IF NOT EXISTS).
-- Triggers, procedures, functions and views live in programmability.sql.
-- Database roles and accounts live in security/roles.sql.
-- =====================================================================
CREATE DATABASE IF NOT EXISTS fittrack_db;
USE fittrack_db;

-- 1. USERS  (application role: admin | member)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,                       -- bcrypt only, never plain text
    role ENUM('admin', 'member') NOT NULL DEFAULT 'member',    -- application-level RBAC
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT chk_users_name CHECK (CHAR_LENGTH(name) BETWEEN 2 AND 100),
    CONSTRAINT chk_users_email CHECK (email LIKE '%@%.%'),
    INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- 2. USER_PROFILES  (1:1 with users)
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INT PRIMARY KEY,
    date_of_birth DATE NULL,
    gender VARCHAR(20) NULL,           -- female | male | non_binary | prefer_not_to_say
    height_cm DECIMAL(5,1) NULL,
    weight_kg DECIMAL(5,1) NULL,
    fitness_level VARCHAR(20) NULL,    -- beginner | intermediate | advanced
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_profile_gender CHECK (gender IS NULL OR gender IN ('female','male','non_binary','prefer_not_to_say')),
    CONSTRAINT chk_profile_level CHECK (fitness_level IS NULL OR fitness_level IN ('beginner','intermediate','advanced')),
    CONSTRAINT chk_profile_height CHECK (height_cm IS NULL OR height_cm BETWEEN 50 AND 260),
    CONSTRAINT chk_profile_weight CHECK (weight_kg IS NULL OR weight_kg BETWEEN 20 AND 400)
) ENGINE=InnoDB;

-- 3. WORKOUT_PLANS  (owned by a user)
CREATE TABLE IF NOT EXISTS workout_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_plan_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. EXERCISES  (shared catalogue, not user-owned)
CREATE TABLE IF NOT EXISTS exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    muscle_group VARCHAR(100),
    equipment_needed VARCHAR(100)
) ENGINE=InnoDB;

-- 5. PLAN_EXERCISES  (M:N between workout_plans and exercises, with attributes)
CREATE TABLE IF NOT EXISTS plan_exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    exercise_id INT NOT NULL,
    sets INT NOT NULL DEFAULT 3,
    reps INT NOT NULL DEFAULT 10,
    target_weight DECIMAL(5,2),
    rest_seconds INT DEFAULT 60,
    exercise_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_pe_plan FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_pe_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT,
    CONSTRAINT chk_pe_sets CHECK (sets BETWEEN 1 AND 50),
    CONSTRAINT chk_pe_reps CHECK (reps BETWEEN 1 AND 500),
    CONSTRAINT chk_pe_rest CHECK (rest_seconds IS NULL OR rest_seconds BETWEEN 0 AND 3600)
) ENGINE=InnoDB;

-- 6. WORKOUT_SESSIONS  (a user's actual workout, optionally following a plan)
CREATE TABLE IF NOT EXISTS workout_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id INT,
    start_time DATETIME NOT NULL,
    end_time DATETIME,                 -- NULL = session still in progress
    notes TEXT,
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_session_plan FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE SET NULL,
    CONSTRAINT chk_session_times CHECK (end_time IS NULL OR end_time >= start_time),
    INDEX idx_user_sessions (user_id, start_time)
) ENGINE=InnoDB;

-- 7. WORKOUT_SETS  (performance per set inside a session)
CREATE TABLE IF NOT EXISTS workout_sets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    exercise_id INT NOT NULL,
    set_number INT NOT NULL,
    reps INT,
    weight DECIMAL(5,2),
    completed BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_set_session FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_set_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT,
    CONSTRAINT chk_set_reps CHECK (reps IS NULL OR reps BETWEEN 0 AND 500),
    CONSTRAINT chk_set_weight CHECK (weight IS NULL OR weight BETWEEN 0 AND 999),
    CONSTRAINT uq_set_number UNIQUE (session_id, exercise_id, set_number),
    INDEX idx_set_exercise (exercise_id)
) ENGINE=InnoDB;

-- 8. FITNESS_GOALS  (per-user targets; status is maintained by trigger trg_session_finished)
CREATE TABLE IF NOT EXISTS fitness_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    goal_type VARCHAR(50) NOT NULL,    -- weekly_workouts | daily_steps | daily_calories | ...
    target_value INT NOT NULL,
    start_date DATE NOT NULL,
    deadline DATE,
    status VARCHAR(50) DEFAULT 'active',   -- active | completed | overdue
    CONSTRAINT fk_goal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_goal_target CHECK (target_value > 0),
    CONSTRAINT chk_goal_dates CHECK (deadline IS NULL OR deadline >= start_date),
    CONSTRAINT chk_goal_status CHECK (status IN ('active','completed','overdue')),
    INDEX idx_user_goals (user_id, status)
) ENGINE=InnoDB;

-- 9. ACTIVITY_LOG  (written by triggers - one row per finished session and per goal completed)
CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_type VARCHAR(40) NOT NULL,   -- SESSION_FINISHED | GOAL_COMPLETED
    message VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_activity_user_time (user_id, created_at)
) ENGINE=InnoDB;

-- 10. ROLE_AUDIT_LOG  (written by procedure sp_change_role - who changed whose role, and when)
CREATE TABLE IF NOT EXISTS role_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_id INT NOT NULL,
    target_user_id INT NOT NULL,
    old_role VARCHAR(10) NOT NULL,
    new_role VARCHAR(10) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
