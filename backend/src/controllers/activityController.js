const memuraiClient = require('../config/memurai');

// All activity data comes from the wearable simulator via Memurai:
//   stream  fittrack:sensors:{userId}                       (one entry per reading)
//   hash    fittrack:activity:daily:{userId}:{YYYY-MM-DD}   (daily totals, UTC date)

const HOUR = 3600 * 1000;
const RANGES = {
    '1h':  { windowMs: HOUR,           bucketMs: 60 * 1000 },
    '24h': { windowMs: 24 * HOUR,      bucketMs: 15 * 60 * 1000 },
    '7d':  { windowMs: 7 * 24 * HOUR,  bucketMs: 2 * HOUR },
    '30d': { windowMs: 30 * 24 * HOUR, bucketMs: 6 * HOUR }
};
const PAGE = 5000;
const MAX_ENTRIES = 200000;

// Status thresholds (the simulator writes every 5 seconds)
const CONNECTED_MAX_AGE_S = 20;
const STALE_MAX_AGE_S = 15 * 60;

const idMs = (id) => Number(String(id).split('-')[0]);
const readingTime = (entry) => {
    const t = Date.parse(entry.message?.timestamp);
    return Number.isFinite(t) ? t : idMs(entry.id);
};
// Stream ID immediately before `id` (for paging backwards without needing the "(" exclusive syntax)
const prevId = (id) => {
    const [ms, seq] = String(id).split('-');
    return Number(seq) > 0 ? `${ms}-${Number(seq) - 1}` : `${Number(ms) - 1}-18446744073709551615`;
};
const dayKey = (d) => d.toISOString().split('T')[0];

async function latestReading(userId) {
    const rows = await memuraiClient.xRevRange(`fittrack:sensors:${userId}`, '+', '-', { COUNT: 1 });
    if (!rows || rows.length === 0) return null;
    const m = rows[0].message;
    return {
        timestamp: new Date(readingTime(rows[0])).toISOString(),
        heart_rate: Number(m.heart_rate),
        step_increment: Number(m.step_increment),
        calories_burned: Number(m.calories_burned),
        activity_state: m.activity_state
    };
}

// GET /api/activity/status -> simulator connection state derived from the newest reading
exports.getStatus = async (req, res) => {
    try {
        const latest = await latestReading(req.user.id);
        const now = Date.now();
        let status = 'disconnected';
        let ageSeconds = null;
        if (latest) {
            ageSeconds = Math.max(0, Math.round((now - Date.parse(latest.timestamp)) / 1000));
            if (ageSeconds <= CONNECTED_MAX_AGE_S) status = 'connected';
            else if (ageSeconds <= STALE_MAX_AGE_S) status = 'no_recent_readings';
        }
        res.json({ status, age_seconds: ageSeconds, server_time: new Date(now).toISOString(), latest });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/activity/readings?range=1h|24h|7d|30d
// Returns bucketed heart-rate / steps / calories points plus a summary and activity-state breakdown.
exports.getReadings = async (req, res) => {
    try {
        const range = RANGES[req.query.range] ? req.query.range : '24h';
        const { windowMs, bucketMs } = RANGES[range];
        const key = `fittrack:sensors:${req.user.id}`;
        const now = Date.now();
        const startMs = now - windowMs;

        const buckets = new Map();
        const states = {};
        let total = 0, hrSum = 0, hrMin = Infinity, hrMax = -Infinity, steps = 0, calories = 0;
        let truncated = false;
        let end = '+';

        while (true) {
            const page = await memuraiClient.xRevRange(key, end, String(startMs), { COUNT: PAGE });
            if (!page || page.length === 0) break;
            for (const entry of page) {
                const t = readingTime(entry);
                const hr = Number(entry.message.heart_rate);
                const st = Number(entry.message.step_increment) || 0;
                const cal = Number(entry.message.calories_burned) || 0;
                const state = entry.message.activity_state || 'unknown';

                const b = Math.floor(t / bucketMs) * bucketMs;
                let bucket = buckets.get(b);
                if (!bucket) {
                    bucket = { t: b, n: 0, hrSum: 0, hrMax: -Infinity, hrMin: Infinity, steps: 0, calories: 0 };
                    buckets.set(b, bucket);
                }
                bucket.n += 1;
                if (Number.isFinite(hr) && hr > 0) {
                    bucket.hrSum += hr;
                    bucket.hrMax = Math.max(bucket.hrMax, hr);
                    bucket.hrMin = Math.min(bucket.hrMin, hr);
                    hrSum += hr; hrMin = Math.min(hrMin, hr); hrMax = Math.max(hrMax, hr);
                }
                bucket.steps += st;
                bucket.calories += cal;
                steps += st; calories += cal; total += 1;
                states[state] = (states[state] || 0) + 1;
            }
            if (total >= MAX_ENTRIES) { truncated = true; break; }
            if (page.length < PAGE) break;
            end = prevId(page[page.length - 1].id);
        }

        const points = [...buckets.values()]
            .sort((a, b) => a.t - b.t)
            .map((b) => ({
                timestamp: new Date(b.t).toISOString(),
                avg_heart_rate: b.hrSum ? Math.round(b.hrSum / b.n) : null,
                min_heart_rate: Number.isFinite(b.hrMin) ? b.hrMin : null,
                max_heart_rate: Number.isFinite(b.hrMax) ? b.hrMax : null,
                steps: b.steps,
                calories: Math.round(b.calories * 10) / 10,
                readings: b.n
            }));

        res.json({
            range,
            bucket_minutes: bucketMs / 60000,
            truncated,
            points,
            summary: {
                readings: total,
                avg_heart_rate: total && hrSum ? Math.round(hrSum / total) : null,
                min_heart_rate: Number.isFinite(hrMin) ? hrMin : null,
                max_heart_rate: Number.isFinite(hrMax) ? hrMax : null,
                steps,
                calories: Math.round(calories)
            },
            states
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/activity/daily?days=7 -> per-day totals from the Memurai daily hashes (UTC dates, oldest first)
exports.getDaily = async (req, res) => {
    try {
        const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 7));
        const dates = [];
        for (let i = days - 1; i >= 0; i--) dates.push(dayKey(new Date(Date.now() - i * 24 * HOUR)));
        const hashes = await Promise.all(
            dates.map((d) => memuraiClient.hGetAll(`fittrack:activity:daily:${req.user.id}:${d}`))
        );
        res.json(dates.map((date, i) => {
            const h = hashes[i];
            const has = Object.keys(h).length > 0;
            return {
                date,
                has_data: has,
                total_steps: Number(h.total_steps || 0),
                total_calories: Math.round(Number(h.total_calories || 0)),
                readings: Number(h.reading_counts || 0)
            };
        }));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
