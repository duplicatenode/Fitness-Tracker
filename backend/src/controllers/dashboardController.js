const pool = require('../config/mysql');
const memuraiClient = require('../config/memurai');

exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 1. Get total workouts from MySQL
        const [sessions] = await pool.query('SELECT COUNT(*) as total FROM workout_sessions WHERE user_id = ?', [userId]);
        const totalWorkouts = sessions[0].total;

        // Additive fields used by the redesigned dashboard
        const [completed] = await pool.query('SELECT COUNT(*) as total FROM workout_sessions WHERE user_id = ? AND end_time IS NOT NULL', [userId]);
        const [week] = await pool.query('SELECT COUNT(*) as total FROM workout_sessions WHERE user_id = ? AND start_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)', [userId]);
        
        // 2. Get active fitness goals from MySQL
        const [goals] = await pool.query('SELECT * FROM fitness_goals WHERE user_id = ? AND status = "active"', [userId]);
        
        // 3. Get latest sensor reading from Memurai Stream
        const streamKey = `fittrack:sensors:${userId}`;
        const latestReadings = await memuraiClient.xRevRange(streamKey, '+', '-', { COUNT: 1 });
        
        let latestSensor = null;
        if (latestReadings && latestReadings.length > 0) {
            latestSensor = latestReadings[0].message;
        }

        // 4. Get today's daily activity summary from Memurai Hash
        const today = new Date().toISOString().split('T')[0];
        const dailyKey = `fittrack:activity:daily:${userId}:${today}`;
        const dailyActivity = await memuraiClient.hGetAll(dailyKey);

        res.json({
            totalWorkouts,
            completedWorkouts: completed[0].total,
            workoutsThisWeek: week[0].total,
            activeGoals: goals,
            latestSensor: latestSensor || { heart_rate: 0, calories_burned: 0, step_increment: 0, activity_state: 'unknown' },
            dailyActivity: Object.keys(dailyActivity).length > 0 ? dailyActivity : { total_steps: 0, total_calories: 0 }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
