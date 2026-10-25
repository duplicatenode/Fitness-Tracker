// Creates fittrack_db from scratch: schema -> stored programs -> seed -> DB roles and accounts.
//   node database/setup_mysql.js
// Needs DB_USER / DB_PASSWORD (an account allowed to CREATE DATABASE, ROLE and USER)
// and, for the role accounts, DB_ADMIN_PASSWORD and DB_MEMBER_PASSWORD in .env.
const mysql = require('mysql2/promise');
const path = require('path');
const { runSqlFile } = require('./sqlRunner');
const { createDbAccounts } = require('./security/create_db_accounts');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
    let conn;
    try {
        console.log('Connecting to MySQL...');
        conn = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: false
        });

        const dir = __dirname;
        console.log(`schema.sql            -> ${await runSqlFile(conn, path.join(dir, 'schema.sql'))} statements`);
        console.log(`programmability.sql   -> ${await runSqlFile(conn, path.join(dir, 'programmability.sql'))} statements (triggers, procedure, function, views)`);
        console.log(`seed.sql              -> ${await runSqlFile(conn, path.join(dir, 'seed.sql'))} statements`);

        if (process.env.DB_ADMIN_PASSWORD && process.env.DB_MEMBER_PASSWORD) {
            await createDbAccounts(conn);
        } else {
            console.warn('Skipped DB role accounts: set DB_ADMIN_PASSWORD and DB_MEMBER_PASSWORD in .env, then run this again.');
        }
        console.log('Database setup complete!');
        process.exitCode = 0;
    } catch (error) {
        console.error('Database setup failed:', error.message);
        process.exitCode = 1;
    } finally {
        if (conn) await conn.end().catch(() => {});
    }
})();
