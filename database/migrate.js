// Upgrades an EXISTING fittrack_db to the latest schema (adds user_profiles + users.last_login_at).
// Safe to run any number of times. The backend also does this automatically on start.
//   node database/migrate.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const ensureSchema = require('../backend/src/config/ensureSchema');
const pool = require('../backend/src/config/mysql');

ensureSchema()
    .then(() => { console.log('Database schema is up to date.'); return pool.end(); })
    .catch((e) => { console.error('Migration failed:', e.message); process.exit(1); });
