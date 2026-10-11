const memuraiClient = require('../config/memurai');

// Progress-photo METADATA lives in Memurai at fittrack:photos:{userId}:{photoId} (see database/README.md).
// No image files are stored by the backend; an entry may optionally carry an http(s) image_url.
const SAFE_ID = /^[A-Za-z0-9_-]+$/;
const keyFor = (userId, id) => `fittrack:photos:${userId}:${id}`;
const isHttpUrl = (v) => typeof v === 'string' && /^https?:\/\//i.test(v);

exports.getPhotos = async (req, res) => {
    try {
        const keys = await memuraiClient.keys(`fittrack:photos:${req.user.id}:*`);
        if (keys.length === 0) return res.json([]);
        const data = await memuraiClient.mGet(keys);
        const photos = data
            .filter(Boolean)
            .map((item) => JSON.parse(item))
            .sort((a, b) => new Date(b.date || b.timestamp || 0) - new Date(a.date || a.timestamp || 0));
        res.json(photos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createPhoto = async (req, res) => {
    try {
        const id = Date.now().toString();
        const entry = {
            id,
            caption: (req.body.caption || '').trim(),
            date: /^\d{4}-\d{2}-\d{2}$/.test(req.body.date || '') ? req.body.date : new Date().toISOString().split('T')[0],
            tags: (Array.isArray(req.body.tags) ? req.body.tags : []).map((t) => String(t).trim()).filter(Boolean),
            image_url: isHttpUrl(req.body.image_url) ? req.body.image_url : null,
            timestamp: new Date().toISOString()
        };
        if (!entry.caption) return res.status(400).json({ error: 'Caption is required' });
        await memuraiClient.set(keyFor(req.user.id, id), JSON.stringify(entry));
        res.status(201).json(entry);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deletePhoto = async (req, res) => {
    try {
        if (!SAFE_ID.test(req.params.id)) return res.status(400).json({ error: 'Invalid photo id' });
        const removed = await memuraiClient.del(keyFor(req.user.id, req.params.id));
        if (!removed) return res.status(404).json({ error: 'Photo not found' });
        res.json({ message: 'Photo entry deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
