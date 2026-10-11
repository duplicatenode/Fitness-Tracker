const redis = require('redis');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const INTERVAL_MS = 5000;          // one reading per user every 5 seconds
const USER_REFRESH_MS = 30000;     // re-read the list of registered users from MySQL
const FALLBACK_USER_IDS = [1];     // used only if MySQL cannot be reached

async function runSimulator() {
    console.log('Starting Wearable Simulator...');

    const client = redis.createClient({
        socket: {
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: process.env.REDIS_PORT || 6379
        }
    });
    client.on('error', (err) => console.error('Memurai Client Error', err));
    await client.connect();

    // MySQL is only used to learn WHICH users exist (so every registered account gets a simulated wearable)
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'fittrack_db',
        connectionLimit: 2
    });

    let userIds = FALLBACK_USER_IDS;
    async function refreshUsers() {
        try {
            const [rows] = await pool.query('SELECT id FROM users ORDER BY id');
            const ids = rows.map((r) => r.id);
            if (ids.join() !== userIds.join()) {
                console.log(`Simulating wearables for ${ids.length} user(s): ${ids.join(', ') || '(none)'}`);
            }
            userIds = ids;
        } catch (err) {
            console.error('Could not read users from MySQL, keeping previous list:', err.message);
        }
    }
    await refreshUsers();
    setInterval(refreshUsers, USER_REFRESH_MS);

    console.log(`Connected to Memurai. Generating simulated data every ${INTERVAL_MS / 1000}s per user`);

    const states = ['resting', 'walking', 'exercising'];

    async function sendReading(userId) {
        const timestamp = new Date().toISOString();
        const today = timestamp.split('T')[0];
        const state = states[Math.floor(Math.random() * states.length)];

        let hr = 70;
        let stepInc = 0;
        let calBurn = 1.2;

        if (state === 'walking') {
            hr = Math.floor(Math.random() * 20) + 90; // 90-110
            stepInc = Math.floor(Math.random() * 10) + 5;
            calBurn = 4.5;
        } else if (state === 'exercising') {
            hr = Math.floor(Math.random() * 40) + 130; // 130-170
            stepInc = Math.floor(Math.random() * 20) + 10;
            calBurn = 10.5;
        } else {
            hr = Math.floor(Math.random() * 15) + 60; // 60-75
        }

        // 1. Push to Stream
        await client.xAdd(`fittrack:sensors:${userId}`, '*', {
            timestamp,
            heart_rate: hr.toString(),
            step_increment: stepInc.toString(),
            calories_burned: calBurn.toString(),
            activity_state: state
        });

        // 2. Update Daily Summary Hash
        const dailyKey = `fittrack:activity:daily:${userId}:${today}`;
        await client.hIncrBy(dailyKey, 'total_steps', stepInc);
        await client.hIncrByFloat(dailyKey, 'total_calories', calBurn);
        await client.hIncrBy(dailyKey, 'reading_counts', 1);

        console.log(`[SIMULATOR] user ${userId}: HR=${hr} BPM | State=${state} | Steps=+${stepInc}`);
    }

    setInterval(async () => {
        for (const userId of userIds) {
            try {
                await sendReading(userId);
            } catch (error) {
                console.error(`Simulator error (user ${userId}):`, error.message);
            }
        }
    }, INTERVAL_MS);

    process.on('SIGINT', async () => {
        console.log('\nGracefully shutting down simulator...');
        await client.quit();
        await pool.end();
        process.exit(0);
    });
}

runSimulator();
