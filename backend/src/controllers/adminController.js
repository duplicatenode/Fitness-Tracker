const pool = require('../config/mysql');

// Admin-only endpoints. Every route is protected by authMiddleware + requireRole('admin'),
// and the role change itself is enforced again INSIDE the database by sp_change_role.

// GET /api/admin/users -> every user (from the v_user_directory view) + role counts
exports.listUsers = async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT id, name, email, role, gender, fitness_level, sessions, active_goals, created_at, last_login_at
             FROM v_user_directory ORDER BY id`
        );
        const roleCounts = { admin: 0, member: 0 };
        users.forEach((u) => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });
        res.json({ total: users.length, roleCounts, users });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// PUT /api/admin/users/:id/role  { role: 'admin' | 'member' }
exports.changeRole = async (req, res) => {
    const role = req.body?.role;
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId)) return res.status(400).json({ message: 'Invalid user id.' });
    try {
        await pool.query('CALL sp_change_role(?, ?, ?)', [req.user.id, targetId, role]);
        const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [targetId]);
        res.json({ message: 'Role updated', user: rows[0] });
    } catch (error) {
        // errors raised by SIGNAL inside the procedure carry SQLSTATE 45000
        const status = error.sqlState === '45000' ? 400 : 500;
        res.status(status).json({ message: error.sqlState === '45000' ? error.sqlMessage : 'Server error' });
    }
};

// GET /api/admin/activity -> latest rows written by the triggers + role audit trail
exports.activity = async (req, res) => {
    try {
        const [log] = await pool.query(
            `SELECT a.id, a.event_type, a.message, a.created_at, u.name AS user_name
             FROM activity_log a JOIN users u ON u.id = a.user_id
             ORDER BY a.id DESC LIMIT 25`
        );
        const [roleChanges] = await pool.query(
            `SELECT r.id, actor.name AS actor_name, target.name AS target_name,
                    r.old_role, r.new_role, r.changed_at
             FROM role_audit_log r
             JOIN users actor ON actor.id = r.actor_id
             JOIN users target ON target.id = r.target_user_id
             ORDER BY r.id DESC LIMIT 25`
        );
        res.json({ log, roleChanges });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
