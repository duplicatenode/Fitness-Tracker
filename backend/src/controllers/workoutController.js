const pool = require('../config/mysql');

const toInt = (v, fallback = null) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
};

const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

// Normalises an optional list of exercises for a plan: [{ exercise_id, sets, reps, rest_seconds, target_weight }]
const cleanExercises = (list) => {
    if (!Array.isArray(list)) return null;
    return list
        .map((e, i) => ({
            exercise_id: toInt(e.exercise_id),
            sets: Math.max(1, toInt(e.sets, 3)),
            reps: Math.max(1, toInt(e.reps, 10)),
            rest_seconds: Math.max(0, toInt(e.rest_seconds, 60)),
            target_weight: e.target_weight === '' || e.target_weight == null ? null : Number(e.target_weight),
            exercise_order: i + 1
        }))
        .filter((e) => e.exercise_id);
};

const insertPlanExercises = async (conn, planId, exercises) => {
    for (const e of exercises) {
        await conn.query(
            `INSERT INTO plan_exercises (plan_id, exercise_id, sets, reps, target_weight, rest_seconds, exercise_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [planId, e.exercise_id, e.sets, e.reps, e.target_weight, e.rest_seconds, e.exercise_order]
        );
    }
};

// EXERCISES
exports.getExercises = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM exercises');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// WORKOUT PLANS
exports.getPlans = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT p.*,
                    (SELECT COUNT(*) FROM plan_exercises pe WHERE pe.plan_id = p.id) AS exercise_count,
                    (SELECT COUNT(*) FROM workout_sessions s WHERE s.plan_id = p.id) AS session_count
             FROM workout_plans p
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC, p.id DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getPlan = async (req, res) => {
    try {
        const [plans] = await pool.query('SELECT * FROM workout_plans WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (plans.length === 0) return res.status(404).json({ error: 'Plan not found' });
        const [exercises] = await pool.query(
            `SELECT pe.id, pe.exercise_id, pe.sets, pe.reps, pe.target_weight, pe.rest_seconds, pe.exercise_order,
                    e.name, e.muscle_group, e.equipment_needed
             FROM plan_exercises pe
             JOIN exercises e ON e.id = pe.exercise_id
             WHERE pe.plan_id = ?
             ORDER BY pe.exercise_order, pe.id`,
            [req.params.id]
        );
        res.json({ ...plans[0], exercises });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createPlan = async (req, res) => {
    const { name, description } = req.body;
    if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Plan name is required' });
    }
    const exercises = cleanExercises(req.body.exercises) || [];
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [result] = await conn.query(
            'INSERT INTO workout_plans (user_id, name, description) VALUES (?, ?, ?)',
            [req.user.id, String(name).trim(), description || null]
        );
        await insertPlanExercises(conn, result.insertId, exercises);
        await conn.commit();
        res.status(201).json({ id: result.insertId, name, description, exercise_count: exercises.length });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        conn.release();
    }
};

exports.updatePlan = async (req, res) => {
    const { name, description } = req.body;
    if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Plan name is required' });
    }
    const exercises = cleanExercises(req.body.exercises); // null = leave exercises untouched
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [result] = await conn.query(
            'UPDATE workout_plans SET name = ?, description = ? WHERE id = ? AND user_id = ?',
            [String(name).trim(), description || null, req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Plan not found' });
        }
        if (exercises) {
            await conn.query('DELETE FROM plan_exercises WHERE plan_id = ?', [req.params.id]);
            await insertPlanExercises(conn, req.params.id, exercises);
        }
        await conn.commit();
        res.json({ id: Number(req.params.id), name, description });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        conn.release();
    }
};

exports.deletePlan = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM workout_plans WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Plan not found' });
        res.json({ message: 'Plan deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// WORKOUT SESSIONS
// Optional query params: from=YYYY-MM-DD, to=YYYY-MM-DD (inclusive)
exports.getSessions = async (req, res) => {
    try {
        const params = [req.user.id];
        let where = 's.user_id = ?';
        if (isDate(req.query.from)) {
            where += ' AND s.start_time >= ?';
            params.push(req.query.from);
        }
        if (isDate(req.query.to)) {
            where += ' AND s.start_time < DATE_ADD(?, INTERVAL 1 DAY)';
            params.push(req.query.to);
        }
        const [rows] = await pool.query(`
            SELECT s.id, s.plan_id, s.start_time, s.end_time, s.notes, p.name as plan_name,
                   TIMESTAMPDIFF(MINUTE, s.start_time, s.end_time) AS duration_minutes,
                   (SELECT COUNT(DISTINCT ws.exercise_id) FROM workout_sets ws
                     WHERE ws.session_id = s.id AND ws.completed = TRUE) AS exercises_completed,
                   (SELECT COUNT(*) FROM workout_sets ws
                     WHERE ws.session_id = s.id AND ws.completed = TRUE) AS sets_completed
            FROM workout_sessions s
            LEFT JOIN workout_plans p ON s.plan_id = p.id
            WHERE ${where}
            ORDER BY s.start_time DESC
        `, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSession = async (req, res) => {
    try {
        const [sessions] = await pool.query(`
            SELECT s.id, s.plan_id, s.start_time, s.end_time, s.notes, p.name as plan_name,
                   TIMESTAMPDIFF(MINUTE, s.start_time, s.end_time) AS duration_minutes
            FROM workout_sessions s
            LEFT JOIN workout_plans p ON s.plan_id = p.id
            WHERE s.id = ? AND s.user_id = ?`, [req.params.id, req.user.id]);
        if (sessions.length === 0) return res.status(404).json({ error: 'Session not found' });
        const [sets] = await pool.query(`
            SELECT ws.id, ws.exercise_id, e.name AS exercise_name, ws.set_number, ws.reps, ws.weight, ws.completed
            FROM workout_sets ws
            JOIN exercises e ON e.id = ws.exercise_id
            WHERE ws.session_id = ?
            ORDER BY ws.exercise_id, ws.set_number`, [req.params.id]);
        res.json({ ...sessions[0], sets });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createSession = async (req, res) => {
    const { plan_id, notes } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO workout_sessions (user_id, plan_id, start_time, notes) VALUES (?, ?, NOW(), ?)',
            [req.user.id, plan_id || null, notes || '']
        );
        res.status(201).json({ id: result.insertId, message: 'Session started' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Marks an in-progress session as finished.
exports.endSession = async (req, res) => {
    try {
        const [result] = await pool.query(
            'UPDATE workout_sessions SET end_time = NOW() WHERE id = ? AND user_id = ? AND end_time IS NULL',
            [req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Session not found or already finished' });
        res.json({ message: 'Session finished' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
