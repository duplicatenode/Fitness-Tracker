const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD length:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 'undefined');
