const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Secrets come only from .env - refuse to start without them
for (const name of ['JWT_SECRET', 'DB_USER', 'DB_PASSWORD']) {
    if (!process.env[name]) {
        console.error(`[config] ${name} is not set. Copy .env.example to .env and fill it in.`);
        process.exit(1);
    }
}

const mysqlPool = require('./config/mysql');
const memuraiClient = require('./config/memurai');
const ensureSchema = require('./config/ensureSchema');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const journalRoutes = require('./routes/journalRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const goalRoutes = require('./routes/goalRoutes');
const activityRoutes = require('./routes/activityRoutes');
const photoRoutes = require('./routes/photoRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/journals', journalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/admin', adminRoutes);

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Check MySQL
        await mysqlPool.query('SELECT 1');
        
        // Check Memurai
        await memuraiClient.ping();

        res.json({ 
            status: 'ok', 
            mysql: 'connected', 
            memurai: 'connected' 
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: 'Database connection failed', 
            details: error.message 
        });
    }
});

// Port Configuration
const PORT = process.env.PORT || 5000;

// Make sure the schema is up to date (idempotent), then start accepting requests
ensureSchema()
    .catch((err) => console.error('[schema] Could not verify/upgrade the database schema:', err.message))
    .finally(() => {
        app.listen(PORT, () => {
            console.log(`FitTrack backend running on port ${PORT}`);
        });
    });
