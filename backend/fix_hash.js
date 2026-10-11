const pool = require('./src/config/mysql');

(async () => {
    try {
        const correctHash = '$2b$10$uN4lve2W8Ex753KQKpAJp.jVmAFzAN7wMDrlYU7LwIA9IGfNlaHOO';
        await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [correctHash, 'demo@fittrack.com']);
        console.log('Successfully updated password hash in MySQL.');
        process.exit(0);
    } catch (err) {
        console.error('Failed to update hash:', err);
        process.exit(1);
    }
})();
