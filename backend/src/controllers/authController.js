const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/mysql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET; // required - checked at startup in app.js

const GENDERS = ['female', 'male', 'non_binary', 'prefer_not_to_say'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ---------------- helpers ---------------- */

const sign = (user) => jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

// Full user record = users row (no password hash) + 1:1 profile row
async function loadUser(id, conn = pool) {
    const [rows] = await conn.query(
        `SELECT u.id, u.name, u.email, u.role, u.created_at, u.last_login_at,
                DATE_FORMAT(p.date_of_birth, '%Y-%m-%d') AS date_of_birth,
                p.gender, p.height_cm, p.weight_kg, p.fitness_level
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE u.id = ?`,
        [id]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        created_at: r.created_at,
        last_login_at: r.last_login_at,
        profile: {
            date_of_birth: r.date_of_birth,
            gender: r.gender,
            height_cm: r.height_cm == null ? null : Number(r.height_cm),
            weight_kg: r.weight_kg == null ? null : Number(r.weight_kg),
            fitness_level: r.fitness_level
        }
    };
}

function validatePassword(pw) {
    if (typeof pw !== 'string' || pw.length < 8) return 'Password must be at least 8 characters.';
    if (Buffer.byteLength(pw) > 72) return 'Password is too long (maximum 72 characters).';
    if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must include at least one letter and one number.';
    return null;
}

// Returns { errors: [], profile: {...cleaned or null} }; absent/blank fields become null
function validateProfile(body) {
    const errors = [];
    const out = { date_of_birth: null, gender: null, height_cm: null, weight_kg: null, fitness_level: null };
    const blank = (v) => v === undefined || v === null || v === '';

    if (!blank(body.date_of_birth)) {
        const d = new Date(`${body.date_of_birth}T00:00:00Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date_of_birth) || Number.isNaN(d.getTime())) {
            errors.push('Date of birth must be a valid date (YYYY-MM-DD).');
        } else {
            const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
            if (age < 10 || age > 120) errors.push('Date of birth must give an age between 10 and 120.');
            else out.date_of_birth = body.date_of_birth;
        }
    }
    if (!blank(body.gender)) {
        if (!GENDERS.includes(body.gender)) errors.push(`Gender must be one of: ${GENDERS.join(', ')}.`);
        else out.gender = body.gender;
    }
    if (!blank(body.height_cm)) {
        const h = Number(body.height_cm);
        if (!Number.isFinite(h) || h < 50 || h > 260) errors.push('Height must be between 50 and 260 cm.');
        else out.height_cm = Math.round(h * 10) / 10;
    }
    if (!blank(body.weight_kg)) {
        const w = Number(body.weight_kg);
        if (!Number.isFinite(w) || w < 20 || w > 400) errors.push('Weight must be between 20 and 400 kg.');
        else out.weight_kg = Math.round(w * 10) / 10;
    }
    if (!blank(body.fitness_level)) {
        if (!LEVELS.includes(body.fitness_level)) errors.push(`Fitness level must be one of: ${LEVELS.join(', ')}.`);
        else out.fitness_level = body.fitness_level;
    }
    return { errors, profile: out };
}

function validateName(name) {
    const n = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
    if (n.length < 2 || n.length > 100) return { error: 'Name must be between 2 and 100 characters.' };
    return { value: n };
}

const upsertProfile = (conn, userId, p) => conn.query(
    `INSERT INTO user_profiles (user_id, date_of_birth, gender, height_cm, weight_kg, fitness_level)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE date_of_birth = VALUES(date_of_birth), gender = VALUES(gender),
                             height_cm = VALUES(height_cm), weight_kg = VALUES(weight_kg),
                             fitness_level = VALUES(fitness_level)`,
    [userId, p.date_of_birth, p.gender, p.height_cm, p.weight_kg, p.fitness_level]
);

/* ---------------- handlers ---------------- */

// POST /api/auth/register  { name, email, password, [date_of_birth, gender, height_cm, weight_kg, fitness_level] }
// Creates the users row and its profile row in ONE transaction, then signs the user in.
exports.register = async (req, res) => {
    const body = req.body || {};
    const { name, email, password } = body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    const nm = validateName(name);
    if (nm.error) return res.status(400).json({ message: nm.error });
    const mail = String(email).trim().toLowerCase();
    if (mail.length > 255 || !EMAIL_RE.test(mail)) return res.status(400).json({ message: 'Enter a valid email address.' });
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ message: pwError });
    const { errors, profile } = validateProfile(body);
    if (errors.length) return res.status(400).json({ message: errors.join(' ') });

    const conn = await pool.getConnection();
    try {
        const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [mail]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hash = await bcrypt.hash(password, 10);
        await conn.beginTransaction();
        const [result] = await conn.query(
            'INSERT INTO users (name, email, password_hash, last_login_at) VALUES (?, ?, ?, NOW())',
            [nm.value, mail, hash]
        );
        await upsertProfile(conn, result.insertId, profile);
        await conn.commit();

        const user = await loadUser(result.insertId);
        res.status(201).json({
            message: 'User registered successfully',
            userId: result.insertId,
            token: sign(user),
            user
        });
    } catch (error) {
        await conn.rollback().catch(() => {});
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'User already exists' });
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        conn.release();
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [String(email).trim().toLowerCase()]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

        res.json({
            message: 'Login successful',
            token: sign(user),
            user: await loadUser(user.id)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// GET /api/auth/me
exports.me = async (req, res) => {
    try {
        const user = await loadUser(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// PUT /api/auth/me  { name, date_of_birth, gender, height_cm, weight_kg, fitness_level }
exports.updateMe = async (req, res) => {
    const body = req.body || {};
    const nm = validateName(body.name);
    if (nm.error) return res.status(400).json({ message: nm.error });
    const { errors, profile } = validateProfile(body);
    if (errors.length) return res.status(400).json({ message: errors.join(' ') });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query('UPDATE users SET name = ? WHERE id = ?', [nm.value, req.user.id]);
        await upsertProfile(conn, req.user.id, profile);
        await conn.commit();
        res.json(await loadUser(req.user.id));
    } catch (error) {
        await conn.rollback().catch(() => {});
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        conn.release();
    }
};

// PUT /api/auth/password  { current_password, new_password }
exports.changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body || {};
        if (!current_password || !new_password) {
            return res.status(400).json({ message: 'Current and new password are required.' });
        }
        const pwError = validatePassword(new_password);
        if (pwError) return res.status(400).json({ message: pwError });

        const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
        if (!(await bcrypt.compare(current_password, rows[0].password_hash))) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }
        const hash = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
        res.json({ message: 'Password updated' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Demo login: signs the demo user in server-side so no password has to live in frontend code.
// Disable with DEMO_LOGIN_ENABLED=false in .env. Demo account email: DEMO_USER_EMAIL (default demo@fittrack.com).
exports.demoLogin = async (req, res) => {
    try {
        if (process.env.DEMO_LOGIN_ENABLED === 'false') {
            return res.status(403).json({ message: 'Demo login is disabled' });
        }
        const email = process.env.DEMO_USER_EMAIL || 'demo@fittrack.com';
        const [users] = await pool.query('SELECT id, email FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Demo user not found. Run the database seed first.' });
        }
        await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [users[0].id]);
        res.json({
            message: 'Login successful',
            token: sign(users[0]),
            user: await loadUser(users[0].id)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
