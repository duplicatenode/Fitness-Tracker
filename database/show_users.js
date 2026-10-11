// Prints every registered user with their stored profile details.
// Passwords are stored only as bcrypt hashes (never readable); just the hash prefix is shown.
//   node database/show_users.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../backend/src/config/mysql');

(async () => {
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.name, u.email, u.created_at, u.last_login_at,
                   DATE_FORMAT(p.date_of_birth, '%Y-%m-%d') AS date_of_birth,
                   p.gender, p.height_cm, p.weight_kg, p.fitness_level,
                   CONCAT(LEFT(u.password_hash, 7), '…(bcrypt hash)') AS password
            FROM users u
            LEFT JOIN user_profiles p ON p.user_id = u.id
            ORDER BY u.id`);
        console.table(rows);
        console.log(`${rows.length} user(s) in fittrack_db.users`);
    } catch (e) {
        console.error('Could not read users:', e.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
