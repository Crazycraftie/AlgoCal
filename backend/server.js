require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// 1. DB CONNECTION (FIXED FOR VERCEL)
mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000, 
    socketTimeoutMS: 45000, 
    family: 4
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ DB Error:", err));

// 2. USER MODEL
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    filters: {
        codeforces: { type: Boolean, default: true },
        leetcode: { type: Boolean, default: true },
        atcoder: { type: Boolean, default: true },
        codechef: { type: Boolean, default: true },
        other: { type: Boolean, default: true }
    },
    alarms: [{ contestId: String, title: String, start: Date }],
    personalEvents: [{ id: String, title: String, start: Date, allDay: Boolean }],
    handles: {
        codeforces: { type: String, default: "" },
        leetcode: { type: String, default: "" },
        atcoder: { type: String, default: "" },
        codechef: { type: String, default: "" },
        geeksforgeeks: { type: String, default: "" }
    }
});

const User = mongoose.model('User', UserSchema);

// 3. MIDDLEWARE
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) { res.status(400).json({ msg: 'Token invalid' }); }
};

// 4. AUTH ROUTES
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User registered" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        
        res.json({ 
            token, 
            user: { email: user.email },
            filters: user.filters,
            alarms: user.alarms,
            personalEvents: user.personalEvents,
            handles: user.handles
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. USER DATA ROUTES
app.post('/api/filters', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.filters = req.body.filters;
        await user.save();
        res.json(user.filters);
    } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/alarms', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const { contestId, title, start } = req.body;
        const baseId = String(contestId).split('_')[0];
        const existsIndex = user.alarms.findIndex(a => String(a.contestId).startsWith(baseId));

        if (existsIndex > -1) { user.alarms.splice(existsIndex, 1); } 
        else { user.alarms.push({ contestId: baseId, title, start }); }
        
        await user.save();
        res.json(user.alarms);
    } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/personal-events', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const { id, title, start, allDay } = req.body;
        user.personalEvents.push({ id, title, start, allDay });
        await user.save();
        res.json(user.personalEvents);
    } catch (err) { res.status(500).send('Server Error'); }
});

app.delete('/api/personal-events/:eventId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.personalEvents = user.personalEvents.filter(e => e.id !== req.params.eventId);
        await user.save();
        res.json(user.personalEvents);
    } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/handles', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.handles = req.body.handles;
        await user.save();
        res.json(user.handles);
    } catch (err) { res.status(500).send('Server Error'); }
});

app.get('/api/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({ filters: user.filters, alarms: user.alarms, personalEvents: user.personalEvents, handles: user.handles });
    } catch (err) { res.status(500).send('Server Error'); }
});

// NEW: ROBUST GFG PROXY ROUTE (Switched to a more stable API)
app.get('/api/gfg/:handle', async (req, res) => {
    try {
        const { handle } = req.params;
        console.log(`🔍 Fetching GFG stats for: ${handle}`); 
        
        // Using a more stable community API
        const response = await axios.get(`https://gfg-stats.vercel.app/api?username=${handle}`);
        
        // The new API returns data inside an 'info' object
        if (!response.data || !response.data.info) {
            console.log("❌ GFG User Not Found or API Error");
            return res.status(404).json({ error: "User not found" });
        }

        const stats = response.data.info;
        
        console.log("✅ GFG Success:", stats.totalProblemsSolved); 
        res.json({
            // Ensure we handle cases where data might be a string or number
            solved: parseInt(stats.totalProblemsSolved) || 0,
            score: parseInt(stats.codingScore) || 0
        });
    } catch (error) {
        // Log the specific error to help debugging
        console.error("❌ GFG API Error:", error.response ? error.response.status : error.message);
        res.status(500).json({ error: "Failed to fetch GFG stats" });
    }
});

// 6. CONTESTS ROUTE
app.get('/api/contests', async (req, res) => {
    try {
        const response = await axios.get('https://clist.by/api/v2/contest/', {
            params: { username: process.env.CLIST_USERNAME, api_key: process.env.CLIST_API_KEY, upcoming: true, order_by: 'start', limit: 150 }
        });

        const allowedPlatforms = ['codeforces.com', 'leetcode.com', 'atcoder.jp', 'codechef.com'];
        const filteredContests = response.data.objects.filter(contest => allowedPlatforms.includes(contest.resource));
        const finalEvents = [];

        filteredContests.forEach(contest => {
            const startDate = new Date(contest.start);
            const endDate = new Date(contest.end);
            const durationHours = (endDate - startDate) / (1000 * 60 * 60);

            let platformKey = 'other';
            let color = '#3b82f6'; 
            if (contest.resource === 'codeforces.com') { platformKey = 'codeforces'; color = '#FFC107'; }
            if (contest.resource === 'leetcode.com') { platformKey = 'leetcode'; color = '#FFA116'; }
            if (contest.resource === 'atcoder.jp') { platformKey = 'atcoder'; color = '#000000'; }
            if (contest.resource === 'codechef.com') { platformKey = 'codechef'; color = '#D32F2F'; }
            
            const baseProps = { title: contest.event, url: contest.href, color: color, extendedProps: { platform: platformKey } };

            if (durationHours > 24) {
                let current = new Date(startDate);
                let dayCount = 0;
                while (current < endDate) {
                    finalEvents.push({ ...baseProps, id: `${contest.id}_part${dayCount}`, start: current.toISOString().split('T')[0] + 'T12:00:00', allDay: false });
                    current.setDate(current.getDate() + 1);
                    dayCount++;
                }
            } else {
                finalEvents.push({ ...baseProps, id: String(contest.id), start: contest.start, end: contest.end, allDay: false });
            }
        });
        res.json(finalEvents);
    } catch (error) { res.status(500).json({ message: "Error fetching data" }); }
});

//app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });

module.exports = app;