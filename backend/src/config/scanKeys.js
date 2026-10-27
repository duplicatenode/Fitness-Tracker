const memuraiClient = require('./memurai');

// Collect every key matching a pattern with SCAN. Unlike KEYS, SCAN walks the
// keyspace in small batches, so it never blocks Memurai while it runs.
async function scanKeys(pattern) {
    const keys = [];
    let cursor = '0';
    do {
        const reply = await memuraiClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = String(reply.cursor);
        keys.push(...reply.keys);
    } while (cursor !== '0');
    return keys;
}

module.exports = { scanKeys };
