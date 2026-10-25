// Creates the two DATABASE accounts and binds each to its role (see security/roles.sql).
//   node database/security/create_db_accounts.js            (standalone)
// Also called by database/setup_mysql.js.
// Passwords come from .env - they are never written into source files:
//   DB_ADMIN_PASSWORD=...   -> account ft_admin  (role fittrack_admin)
//   DB_MEMBER_PASSWORD=...  -> account ft_member (role fittrack_member)
const mysql = require('mysql2/promise');
const path = require('path');
const { runSqlFile } = require('../sqlRunner');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const ACCOUNTS = [
    { user: 'ft_admin', role: 'fittrack_admin', envVar: 'DB_ADMIN_PASSWORD' },
    { user: 'ft_member', role: 'fittrack_member', envVar: 'DB_MEMBER_PASSWORD' }
];

async function createDbAccounts(conn) {
    await runSqlFile(conn, path.join(__dirname, 'roles.sql'));

    for (const acc of ACCOUNTS) {
        const pw = process.env[acc.envVar];
        if (!pw) throw new Error(`${acc.envVar} is not set in .env`);
        const who = `'${acc.user}'@'localhost'`;
        await conn.query(`CREATE USER IF NOT EXISTS ${who} IDENTIFIED BY ${conn.escape(pw)}`);
        await conn.query(`ALTER USER ${who} IDENTIFIED BY ${conn.escape(pw)}`);
        await conn.query(`GRANT '${acc.role}' TO ${who}`);
        // Activate the role at login. MySQL 8 and MariaDB use different syntax.
        try {
            await conn.query(`SET DEFAULT ROLE ALL TO ${who}`);              // MySQL 8
        } catch (e) {
            await conn.query(`SET DEFAULT ROLE '${acc.role}' FOR ${who}`);  // MariaDB
        }
        console.log(`[db] account ${acc.user} -> role ${acc.role}`);
    }
}

module.exports = { createDbAccounts };

if (require.main === module) {
    (async () => {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: false
        });
        try {
            await createDbAccounts(conn);
            console.log('Database accounts and roles are ready.');
        } catch (e) {
            console.error('Could not create accounts:', e.message);
            process.exitCode = 1;
        } finally {
            await conn.end();
        }
    })();
}
