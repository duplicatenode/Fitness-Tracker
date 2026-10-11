const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runDatabaseSetup() {
    try {
        console.log('Connecting to MySQL (initial connection)...');
        // Initial connection without database to create it if it doesn't exist
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true // Required to run multi-statement SQL files
        });

        console.log('Connected successfully. Executing schema.sql...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await connection.query(schemaSql);
        console.log('Schema created successfully.');

        console.log('Executing seed.sql...');
        const seedPath = path.join(__dirname, 'seed.sql');
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await connection.query(seedSql);
        console.log('Seed data inserted successfully.');

        await connection.end();
        console.log('Database setup complete!');
        process.exit(0);

    } catch (error) {
        console.error('Database setup failed:', error.message);
        process.exit(1);
    }
}

runDatabaseSetup();
