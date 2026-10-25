// Upgrades an EXISTING fittrack_db to the latest schema and stored programs. Safe to re-run.
//   node database/migrate.js
// (The backend also upgrades the tables/columns automatically on start.)
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const ensureSchema = require('../backend/src/config/ensureSchema');
const pool = require('../backend/src/config/mysql');
const { runSqlFile } = require('./sqlRunner');

(async () => {
    try {
        await ensureSchema();
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'fittrack_db',
            multipleStatements: false
        });
        await runSqlFile(conn, path.join(__dirname, 'programmability.sql'));
        await conn.end();
        console.log('Database schema and stored programs are up to date.');
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
