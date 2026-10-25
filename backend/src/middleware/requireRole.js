const pool = require('../config/mysql');

// Application-level RBAC. The role is read from the database on every request,
// so a demoted admin loses access immediately (the token alone is not trusted for roles).
// Usage: router.use(authMiddleware, requireRole('admin'))
module.exports = function requireRole(...allowed) {
    return async (req, res, next) => {
        try {
            const [rows] = await pool.query('SELECT role FROM users WHERE id = ?', [req.user.id]);
            if (rows.length === 0 || !allowed.includes(rows[0].role)) {
                return res.status(403).json({ message: 'You do not have permission for this action.' });
            }
            req.user.role = rows[0].role;
            next();
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    };
};
