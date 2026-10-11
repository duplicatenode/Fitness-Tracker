const redis = require('redis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMemuraiSetup() {
    const client = redis.createClient({
        socket: {
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: process.env.REDIS_PORT || 6379
        }
    });

    client.on('error', (err) => console.error('Memurai Client Error', err));

    try {
        console.log('Connecting to Memurai...');
        await client.connect();
        console.log('Connected successfully.');

        // Test writing a sample journal entry (Hash / JSON serialized)
        const userId = 1;
        const journalId = 'demo-journal-1';
        const journalKey = `fittrack:journal:${userId}:${journalId}`;
        const journalEntry = {
            id: journalId,
            title: 'First Demo Workout',
            notes: 'Felt pretty good. Ready to track more!',
            mood: 'energetic',
            tags: ['full-body', 'strength'],
            timestamp: new Date().toISOString()
        };

        console.log(`Writing sample journal entry to key: ${journalKey}`);
        await client.set(journalKey, JSON.stringify(journalEntry));

        // Test adding a sample sensor reading to a Stream
        const streamKey = `fittrack:sensors:${userId}`;
        const reading = {
            timestamp: new Date().toISOString(),
            heart_rate: '85',
            step_increment: '0',
            calories_burned: '1.2',
            activity_state: 'resting'
        };

        console.log(`Writing sample sensor reading to stream: ${streamKey}`);
        // XADD streamKey * field1 value1 field2 value2 ...
        await client.xAdd(streamKey, '*', {
            timestamp: reading.timestamp,
            heart_rate: reading.heart_rate,
            step_increment: reading.step_increment,
            calories_burned: reading.calories_burned,
            activity_state: reading.activity_state
        });

        console.log('Memurai setup and initial tests completed successfully.');
        await client.quit();
        process.exit(0);

    } catch (error) {
        console.error('Memurai setup failed:', error.message);
        process.exit(1);
    }
}

runMemuraiSetup();
