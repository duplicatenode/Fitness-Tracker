const memuraiClient = require('../config/memurai');
const { scanKeys } = require('../config/scanKeys');

const SAFE_ID = /^[A-Za-z0-9_-]+$/;
const keyFor = (userId, id) => `fittrack:journal:${userId}:${id}`;
const cleanTags = (tags) =>
    (Array.isArray(tags) ? tags : [])
        .map((t) => String(t).trim())
        .filter(Boolean);

exports.getJournals = async (req, res) => {
    try {
        const userId = req.user.id;
        const pattern = `fittrack:journal:${userId}:*`;
        
        // SCAN (non-blocking) instead of KEYS
        const keys = await scanKeys(pattern);
        
        if (keys.length === 0) return res.json([]);
        
        // Get all values
        const data = await memuraiClient.mGet(keys);
        
        // Parse JSON strings and sort by timestamp descending
        const journals = data
            .filter(Boolean)
            .map(item => JSON.parse(item))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
        res.json(journals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createJournal = async (req, res) => {
    try {
        const userId = req.user.id;
        const journalId = Date.now().toString();
        const journalKey = keyFor(userId, journalId);
        
        const journalEntry = {
            id: journalId,
            title: req.body.title || 'Untitled',
            notes: req.body.notes || '',
            mood: req.body.mood || 'neutral',
            tags: cleanTags(req.body.tags),
            timestamp: new Date().toISOString()
        };
        
        await memuraiClient.set(journalKey, JSON.stringify(journalEntry));
        res.status(201).json(journalEntry);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateJournal = async (req, res) => {
    try {
        const { id } = req.params;
        if (!SAFE_ID.test(id)) return res.status(400).json({ error: 'Invalid journal id' });
        const key = keyFor(req.user.id, id);
        const existing = await memuraiClient.get(key);
        if (!existing) return res.status(404).json({ error: 'Journal entry not found' });

        const current = JSON.parse(existing);
        const updated = {
            ...current,
            title: req.body.title !== undefined ? (req.body.title || 'Untitled') : current.title,
            notes: req.body.notes !== undefined ? req.body.notes : current.notes,
            mood: req.body.mood !== undefined ? (req.body.mood || 'neutral') : current.mood,
            tags: req.body.tags !== undefined ? cleanTags(req.body.tags) : current.tags,
            updated_at: new Date().toISOString()
        };
        await memuraiClient.set(key, JSON.stringify(updated));
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteJournal = async (req, res) => {
    try {
        const { id } = req.params;
        if (!SAFE_ID.test(id)) return res.status(400).json({ error: 'Invalid journal id' });
        const removed = await memuraiClient.del(keyFor(req.user.id, id));
        if (!removed) return res.status(404).json({ error: 'Journal entry not found' });
        res.json({ message: 'Journal entry deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
