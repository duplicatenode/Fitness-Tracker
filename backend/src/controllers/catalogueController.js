const pool = require('../config/mysql');

// Exercise catalogue: body parts and the exercises an admin puts under each one.
// Members only READ it (GET /api/workouts/body-parts) and build plans from it;
// every write below is mounted under /api/admin (authMiddleware + requireRole('admin')).

const toInt = (v) => {
    const n = Number(v);
    return Number.isInteger(n) ? n : null;
};

// Turn the database's own errors into messages people can act on
function dbError(res, error, what) {
    switch (error.code) {
        case 'ER_DUP_ENTRY':
            return res.status(409).json({ message: `${what === 'exercise' ? 'An exercise' : 'A body part'} with that name already exists.` });
        case 'ER_ROW_IS_REFERENCED_2':
            return res.status(409).json({
                message: what === 'body part'
                    ? 'This body part still has exercises. Move or delete them first.'
                    : 'This exercise is used in workout plans or logged sets, so it cannot be deleted.'
            });
        case 'ER_NO_REFERENCED_ROW_2':
            return res.status(400).json({ message: 'That body part does not exist.' });
        case 'ER_CHECK_CONSTRAINT_VIOLATED':
            return res.status(400).json({ message: error.sqlMessage });
        default:
            return res.status(500).json({ message: 'Server error', error: error.message });
    }
}

// GET /api/workouts/body-parts  and  GET /api/admin/body-parts
// -> [{ id, name, description, exercises: [{ id, name, equipment_needed, default_sets, default_reps, ... }] }]
exports.listBodyParts = async (req, res) => {
    try {
        const [parts] = await pool.query('SELECT id, name, description FROM body_parts ORDER BY id');
        const [exercises] = await pool.query(
            `SELECT e.id, e.name, e.description, e.body_part_id, e.equipment_needed, e.default_sets, e.default_reps,
                    (SELECT COUNT(DISTINCT pe.plan_id) FROM plan_exercises pe WHERE pe.exercise_id = e.id) AS plan_count
             FROM exercises e
             ORDER BY e.body_part_id, e.id`
        );
        res.json(parts.map((p) => ({ ...p, exercises: exercises.filter((e) => e.body_part_id === p.id) })));
    } catch (error) {
        dbError(res, error, 'body part');
    }
};

// ---- body parts (admin) ---------------------------------------------

const cleanPart = (body) => ({
    name: String(body?.name || '').trim(),
    description: String(body?.description || '').trim() || null
});

exports.createBodyPart = async (req, res) => {
    const part = cleanPart(req.body);
    if (part.name.length < 2) return res.status(400).json({ message: 'Body part name must be at least 2 characters.' });
    try {
        const [r] = await pool.query('INSERT INTO body_parts (name, description) VALUES (?, ?)', [part.name, part.description]);
        res.status(201).json({ id: r.insertId, ...part });
    } catch (error) {
        dbError(res, error, 'body part');
    }
};

exports.updateBodyPart = async (req, res) => {
    const id = toInt(req.params.id);
    const part = cleanPart(req.body);
    if (!id) return res.status(400).json({ message: 'Invalid body part id.' });
    if (part.name.length < 2) return res.status(400).json({ message: 'Body part name must be at least 2 characters.' });
    try {
        const [r] = await pool.query('UPDATE body_parts SET name = ?, description = ? WHERE id = ?', [part.name, part.description, id]);
        if (r.affectedRows === 0) return res.status(404).json({ message: 'Body part not found.' });
        res.json({ id, ...part });
    } catch (error) {
        dbError(res, error, 'body part');
    }
};

// ON DELETE RESTRICT on exercises.body_part_id: MySQL refuses while exercises remain
exports.deleteBodyPart = async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid body part id.' });
    try {
        const [r] = await pool.query('DELETE FROM body_parts WHERE id = ?', [id]);
        if (r.affectedRows === 0) return res.status(404).json({ message: 'Body part not found.' });
        res.json({ message: 'Body part deleted' });
    } catch (error) {
        dbError(res, error, 'body part');
    }
};

// ---- exercises (admin) ----------------------------------------------

const cleanExercise = (body) => ({
    name: String(body?.name || '').trim(),
    description: String(body?.description || '').trim() || null,
    body_part_id: toInt(body?.body_part_id),
    equipment_needed: String(body?.equipment_needed || '').trim() || null,
    default_sets: toInt(body?.default_sets) ?? 3,
    default_reps: toInt(body?.default_reps) ?? 10
});

const exerciseProblem = (ex) => {
    if (ex.name.length < 2) return 'Exercise name must be at least 2 characters.';
    if (!ex.body_part_id) return 'Choose a body part.';
    return null;   // sets/reps ranges are checked by the CHECK constraints in MySQL
};

exports.createExercise = async (req, res) => {
    const ex = cleanExercise(req.body);
    const problem = exerciseProblem(ex);
    if (problem) return res.status(400).json({ message: problem });
    try {
        const [r] = await pool.query(
            `INSERT INTO exercises (name, description, body_part_id, equipment_needed, default_sets, default_reps)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [ex.name, ex.description, ex.body_part_id, ex.equipment_needed, ex.default_sets, ex.default_reps]
        );
        res.status(201).json({ id: r.insertId, ...ex });
    } catch (error) {
        dbError(res, error, 'exercise');
    }
};

exports.updateExercise = async (req, res) => {
    const id = toInt(req.params.id);
    const ex = cleanExercise(req.body);
    if (!id) return res.status(400).json({ message: 'Invalid exercise id.' });
    const problem = exerciseProblem(ex);
    if (problem) return res.status(400).json({ message: problem });
    try {
        const [r] = await pool.query(
            `UPDATE exercises SET name = ?, description = ?, body_part_id = ?, equipment_needed = ?,
                    default_sets = ?, default_reps = ?
             WHERE id = ?`,
            [ex.name, ex.description, ex.body_part_id, ex.equipment_needed, ex.default_sets, ex.default_reps, id]
        );
        if (r.affectedRows === 0) return res.status(404).json({ message: 'Exercise not found.' });
        res.json({ id, ...ex });
    } catch (error) {
        dbError(res, error, 'exercise');
    }
};

// ON DELETE RESTRICT on plan_exercises / workout_sets: MySQL refuses while it is in use
exports.deleteExercise = async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid exercise id.' });
    try {
        const [r] = await pool.query('DELETE FROM exercises WHERE id = ?', [id]);
        if (r.affectedRows === 0) return res.status(404).json({ message: 'Exercise not found.' });
        res.json({ message: 'Exercise deleted' });
    } catch (error) {
        dbError(res, error, 'exercise');
    }
};
