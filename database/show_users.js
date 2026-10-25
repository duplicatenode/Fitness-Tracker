// Prints every registered user with role and profile details.
// Passwords are stored only as bcrypt hashes; just the hash prefix is shown.
//   node database/show_users.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../backend/src/config/mysql');

(async () => {
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.name, u.email, u.role, u.created_at, u.last_login_at,
                   DATE_FORMAT(p.date_of_birth, '%Y-%m-%d') AS date_of_birth,
                   p.gender, p.height_cm, p.weight_kg, p.fitness_level,
                   CONCAT(LEFT(u.password_hash, 7), '...(bcrypt)') AS password
            FROM users u
            LEFT JOIN user_profiles p ON p.user_id = u.id
            ORDER BY u.id`);
        console.table(rows);
        const roles = {};
        rows.forEach((r) => { roles[r.role] = (roles[r.role] || 0) + 1; });
        console.log(`${rows.length} user(s) in fittrack_db.users  ->  roles: ${JSON.stringify(roles)}`);
    } catch (e) {
        console.error('Could not read users:', e.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
