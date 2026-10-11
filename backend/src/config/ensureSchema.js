const pool = require('./mysql');

/**
 * Idempotent schema upgrade, run on backend start (and by `node database/migrate.js`).
 * Brings an existing fittrack_db up to date without touching existing data:
 *   - users.last_login_at              (new column)
 *   - user_profiles                    (new 1:1 table with the user's personal details)
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
}

module.exports = ensureSchema;
