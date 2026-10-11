-- Create Database
CREATE DATABASE IF NOT EXISTS fittrack_db;
USE fittrack_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB;

-- 1b. User Profiles Table (1:1 with users — personal details collected at sign-up)
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INT PRIMARY KEY,
    date_of_birth DATE NULL,
    gender VARCHAR(20) NULL,           -- female | male | non_binary | prefer_not_to_say
    height_cm DECIMAL(5,1) NULL,
    weight_kg DECIMAL(5,1) NULL,
    fitness_level VARCHAR(20) NULL,    -- beginner | intermediate | advanced
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2. Workout Plans Table
CREATE TABLE IF NOT EXISTS workout_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Exercises Table
CREATE TABLE IF NOT EXISTS exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    muscle_group VARCHAR(100),
    equipment_needed VARCHAR(100)
) ENGINE=InnoDB;

-- 4. Plan Exercises (Many-to-Many linking Plans and Exercises)
CREATE TABLE IF NOT EXISTS plan_exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    exercise_id INT NOT NULL,
    sets INT NOT NULL DEFAULT 3,
    reps INT NOT NULL DEFAULT 10,
    target_weight DECIMAL(5,2),
    rest_seconds INT DEFAULT 60,
    exercise_order INT NOT NULL DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 5. Workout Sessions Table
CREATE TABLE IF NOT EXISTS workout_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id INT,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 6. Workout Sets (Records actual performance per session)
CREATE TABLE IF NOT EXISTS workout_sets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    exercise_id INT NOT NULL,
    set_number INT NOT NULL,
    reps INT,
    weight DECIMAL(5,2),
    completed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 7. Fitness Goals Table
CREATE TABLE IF NOT EXISTS fitness_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    goal_type VARCHAR(50) NOT NULL, -- e.g., 'weekly_workouts', 'daily_steps'
    target_value INT NOT NULL,
    start_date DATE NOT NULL,
    deadline DATE,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'overdue'
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Create Indexes for performance
CREATE INDEX idx_user_sessions ON workout_sessions(user_id, start_time);
CREATE INDEX idx_user_goals ON fitness_goals(user_id, status);
