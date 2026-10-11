const pool = require('../config/mysql');
const memuraiClient = require('../config/memurai');

const STATUSES = ['active', 'completed', 'overdue'];
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const todayUtc = () => new Date().toISOString().split('T')[0];

// Goal types whose progress can be measured from real data. Any other goal_type
// is returned with current_value = null (progress is not tracked automatically).
const TRACKED = {
    weekly_workouts: { unit: 'workouts' },
    daily_steps: { unit: 'steps' },
    daily_calories: { unit: 'kcal' }
};

async function measure(goal, userId, daily) {
    switch (goal.goal_type) {
        case 'weekly_workouts': {
            const params = [userId, goal.start_date];
            let sql = 'SELECT COUNT(*) AS n FROM workout_sessions WHERE user_id = ? AND start_time >= ?';
            if (goal.deadline) {
                sql += ' AND start_time < DATE_ADD(?, INTERVAL 1 DAY)';
                params.push(goal.deadline);
            }
            const [rows] = await pool.query(sql, params);
            return rows[0].n;
        }
        case 'daily_steps':
            return Number(daily.total_steps || 0);
        case 'daily_calories':
            return Math.round(Number(daily.total_calories || 0));
        default:
            return null;
    }
}

async function withProgress(goals, userId) {
    let daily = {};
    try {
        daily = await memuraiClient.hGetAll(`fittrack:activity:daily:${userId}:${todayUtc()}`);
    } catch (e) {
        daily = {};
    }
    return Promise.all(goals.map(async (g) => {
        const current = await measure(g, userId, daily);
        const tracked = current !== null;
        return {
            ...g,
            tracked,
            unit: TRACKED[g.goal_type]?.unit || null,
            current_value: current,
            progress_pct: tracked && g.target_value > 0 ? Math.min(100, Math.round((current / g.target_value) * 100)) : null
        };
    }));
}

function validate(body, partial = false) {
    const errors = [];
    const out = {};
    if (!partial || body.goal_type !== undefined) {
        const t = String(body.goal_type || '').trim().toLowerCase().replace(/\s+/g, '_');
        if (!t || t.length > 50) errors.push('goal_type is required (max 50 characters)');
        out.goal_type = t;
    }
    if (!partial || body.target_value !== undefined) {
        const n = parseInt(body.target_value, 10);
        if (!Number.isFinite(n) || n <= 0) errors.push('target_value must be a positive number');
        out.target_value = n;
    }
    if (body.start_date !== undefined) {
        if (!isDate(body.start_date)) errors.push('start_date must be YYYY-MM-DD');
        out.start_date = body.start_date;
    }
    if (body.deadline !== undefined) {
        if (body.deadline !== null && body.deadline !== '' && !isDate(body.deadline)) errors.push('deadline must be YYYY-MM-DD');
        out.deadline = body.deadline || null;
    }
    if (body.status !== undefined) {
        if (!STATUSES.includes(body.status)) errors.push(`status must be one of: ${STATUSES.join(', ')}`);
        out.status = body.status;
    }
    return { errors, out };
}

exports.getGoals = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, goal_type, target_value,
                    DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
                    DATE_FORMAT(deadline, '%Y-%m-%d') AS deadline,
                    status
             FROM fitness_goals WHERE user_id = ? ORDER BY (status = 'active') DESC, deadline IS NULL, deadline ASC, id DESC`,
            [req.user.id]
        );
        res.json(await withProgress(rows, req.user.id));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createGoal = async (req, res) => {
    const { errors, out } = validate(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    try {
        const [result] = await pool.query(
            'INSERT INTO fitness_goals (user_id, goal_type, target_value, start_date, deadline, status) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, out.goal_type, out.target_value, out.start_date || todayUtc(), out.deadline || null, out.status || 'active']
        );
        res.status(201).json({ id: result.insertId, ...out });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateGoal = async (req, res) => {
    const { errors, out } = validate(req.body, true);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    const fields = Object.keys(out);
    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    try {
        const [result] = await pool.query(
            `UPDATE fitness_goals SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ? AND user_id = ?`,
            [...fields.map((f) => out[f]), req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Goal not found' });
        res.json({ id: Number(req.params.id), ...out });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteGoal = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM fitness_goals WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Goal not found' });
        res.json({ message: 'Goal deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
