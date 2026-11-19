const pool = require('./mysql');

/**
 * Idempotent schema upgrade, run on backend start (and by `node database/migrate.js`).
 * Brings an existing fittrack_db up to date without touching existing data:
 *   - users.last_login_at              (column)
 *   - users.role                       (column: admin | member, RBAC)
 *   - user_profiles                    (1:1 table with the user's personal details)
 *   - activity_log, role_audit_log     (tables written by triggers / sp_change_role)
 *   - body_parts + exercises.body_part_id / default_sets / default_reps
 *       (admin-managed catalogue; converts the old exercises.muscle_group text column)
 * Triggers, procedures and views are created by database/programmability.sql
 * (run by database/setup_mysql.js or database/migrate.js).
 */
async function columnExists(table, column) {
    const [rows] = await pool.query(
        `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
    );
    return rows[0].n > 0;
}

async function ensureSchema() {
    if (!(await columnExists('users', 'last_login_at'))) {
        await pool.query('ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL DEFAULT NULL');
        console.log('[schema] Added users.last_login_at');
    }

    if (!(await columnExists('users', 'role'))) {
        await pool.query("ALTER TABLE users ADD COLUMN role ENUM('admin','member') NOT NULL DEFAULT 'member'");
        console.log('[schema] Added users.role');
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_profiles (
            user_id INT PRIMARY KEY,
            date_of_birth DATE NULL,
            gender VARCHAR(20) NULL,
            height_cm DECIMAL(5,1) NULL,
            weight_kg DECIMAL(5,1) NULL,
            fitness_level VARCHAR(20) NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS activity_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            event_type VARCHAR(40) NOT NULL,
            message VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_activity_user_time (user_id, created_at)
        ) ENGINE=InnoDB
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS role_audit_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            actor_id INT NOT NULL,
            target_user_id INT NOT NULL,
            old_role VARCHAR(10) NOT NULL,
            new_role VARCHAR(10) NOT NULL,
            changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_audit_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    `);

    await ensureBodyParts();
}

// The seven standard body parts, with fixed ids so seed.sql lines up after an upgrade
const BODY_PARTS = [
    [1, 'Chest', 'Pushing muscles of the upper body'],
    [2, 'Back', 'Pulling muscles of the upper body'],
    [3, 'Legs', 'Quads, hamstrings, glutes and calves'],
    [4, 'Shoulders', 'Front, side and rear delts'],
    [5, 'Arms', 'Biceps and triceps'],
    [6, 'Core', 'Abs and obliques'],
    [7, 'Cardio', 'Heart-rate and endurance work']
];

async function ensureBodyParts() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS body_parts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            description VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT chk_body_part_name CHECK (CHAR_LENGTH(name) BETWEEN 2 AND 50)
        ) ENGINE=InnoDB
    `);

    // Old schema: exercises.muscle_group (free text). Convert it into rows of body_parts + a foreign key.
    if (await columnExists('exercises', 'body_part_id')) return;
    await pool.query('INSERT IGNORE INTO body_parts (id, name, description) VALUES ?', [BODY_PARTS]);
    if (await columnExists('exercises', 'muscle_group')) {
        await pool.query(`INSERT IGNORE INTO body_parts (name)
                          SELECT DISTINCT TRIM(muscle_group) FROM exercises
                          WHERE muscle_group IS NOT NULL AND CHAR_LENGTH(TRIM(muscle_group)) >= 2`);
    }
    await pool.query("INSERT IGNORE INTO body_parts (name, description) VALUES ('Other', 'Exercises without a body part')");
    await pool.query(`ALTER TABLE exercises
        ADD COLUMN body_part_id INT NULL AFTER description,
        ADD COLUMN default_sets INT NOT NULL DEFAULT 3,
        ADD COLUMN default_reps INT NOT NULL DEFAULT 10`);
    if (await columnExists('exercises', 'muscle_group')) {
        await pool.query(`UPDATE exercises e JOIN body_parts bp ON bp.name = TRIM(e.muscle_group)
                          SET e.body_part_id = bp.id`);
    }
    await pool.query(`UPDATE exercises SET body_part_id = (SELECT id FROM body_parts WHERE name = 'Other')
                      WHERE body_part_id IS NULL`);
    await pool.query(`ALTER TABLE exercises
        MODIFY body_part_id INT NOT NULL,
        ADD CONSTRAINT fk_exercise_body_part FOREIGN KEY (body_part_id) REFERENCES body_parts(id) ON DELETE RESTRICT,
        ADD CONSTRAINT chk_ex_default_sets CHECK (default_sets BETWEEN 1 AND 50),
        ADD CONSTRAINT chk_ex_default_reps CHECK (default_reps BETWEEN 1 AND 500),
        ADD INDEX idx_ex_body_part (body_part_id)`);
    if (await columnExists('exercises', 'muscle_group')) {
        await pool.query('ALTER TABLE exercises DROP COLUMN muscle_group');
    }
    // remove the fallback group again if nothing ended up in it
    await pool.query(`DELETE FROM body_parts WHERE name = 'Other'
                      AND NOT EXISTS (SELECT 1 FROM exercises e WHERE e.body_part_id = body_parts.id)`);
    console.log('[schema] Added body_parts and linked every exercise to its body part');
}

module.exports = ensureSchema;
