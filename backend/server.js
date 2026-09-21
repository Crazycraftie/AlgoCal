require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const webpush = require('web-push');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// WEB PUSH SETUP (real push notifications, delivered even when the tab is closed)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn("⚠️ VAPID keys not set — push notifications are disabled");
}

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
    alarms: [{ contestId: String, title: String, start: Date, notified: { type: Boolean, default: false } }],
    personalEvents: [{ id: String, title: String, start: Date, allDay: Boolean }],
    handles: {
        codeforces: { type: String, default: "" },
        leetcode: { type: String, default: "" },
        atcoder: { type: String, default: "" },
        codechef: { type: String, default: "" },
        geeksforgeeks: { type: String, default: "" }
    },
    pushSubscriptions: [{
        endpoint: String,
        keys: { p256dh: String, auth: String }
    }]
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
        const existsIndex = user.alarms.findIndex(a => String(a.contestId).split('_')[0] === baseId);

        if (existsIndex > -1) { user.alarms.splice(existsIndex, 1); }
        else { user.alarms.push({ contestId, title, start }); }
        
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

// WEB PUSH ROUTES
app.get('/api/vapid-public-key', (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

app.post('/api/push-subscribe', auth, async (req, res) => {
    try {
        const sub = req.body;
        if (!sub || !sub.endpoint || !sub.keys) return res.status(400).json({ error: 'Invalid subscription' });

        const user = await User.findById(req.user.id);
        const alreadySubscribed = user.pushSubscriptions.some(s => s.endpoint === sub.endpoint);
        if (!alreadySubscribed) {
            user.pushSubscriptions.push({ endpoint: sub.endpoint, keys: sub.keys });
            await user.save();
        }
        res.json({ ok: true });
    } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/push-unsubscribe', auth, async (req, res) => {
    try {
        const { endpoint } = req.body;
        const user = await User.findById(req.user.id);
        user.pushSubscriptions = user.pushSubscriptions.filter(s => s.endpoint !== endpoint);
        await user.save();
        res.json({ ok: true });
    } catch (err) { res.status(500).send('Server Error'); }
});

// Scans every user's alarms for contests starting in ~15 minutes and pushes a
// notification to each of their subscribed devices. Runs on a local cron in dev;
// in production it must be triggered externally (see CRON_SETUP.md) since Vercel
// serverless functions can't run a persistent in-process scheduler.
const checkAndSendAlarms = async () => {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

    const now = Date.now();
    const windowStart = new Date(now + 13 * 60 * 1000);
    const windowEnd = new Date(now + 16 * 60 * 1000);

    try {
        const users = await User.find({
            'alarms.0': { $exists: true },
            'pushSubscriptions.0': { $exists: true }
        });

        for (const user of users) {
            let changed = false;

            for (const alarm of user.alarms) {
                if (alarm.notified) continue;
                const start = new Date(alarm.start);
                if (start < windowStart || start > windowEnd) continue;

                const payload = JSON.stringify({
                    title: 'Contest Starting Soon!',
                    body: `${alarm.title} starts in 15 minutes!`,
                    url: '/'
                });

                for (const sub of [...user.pushSubscriptions]) {
                    try {
                        await webpush.sendNotification(sub, payload);
                    } catch (err) {
                        // Subscription is dead (browser revoked it / user cleared data) — drop it.
                        if (err.statusCode === 404 || err.statusCode === 410) {
                            user.pushSubscriptions = user.pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
                            changed = true;
                        } else {
                            console.error('❌ Push send error:', err.message);
                        }
                    }
                }

                alarm.notified = true;
                changed = true;
            }

            if (changed) await user.save();
        }
    } catch (err) {
        console.error('❌ Alarm check error:', err.message);
    }
};

// Protected trigger for an external scheduler (Vercel Cron / cron-job.org) to call in production.
app.get('/api/cron/check-alarms', async (req, res) => {
    if (process.env.CRON_SECRET && req.header('x-cron-secret') !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    await checkAndSendAlarms();
    res.json({ ok: true });
});

// LEETCODE CONTEST RATING PROXY (leetcode.com/graphql has no CORS headers, and the
// third-party stats API we use for solved-count doesn't expose contest rating)
app.get('/api/leetcode-contest/:handle', async (req, res) => {
    try {
        const { handle } = req.params;
        console.log(`🔍 Fetching LeetCode contest rating for: ${handle}`);

        const response = await axios.post('https://leetcode.com/graphql', {
            query: `query userContestRankingInfo($username: String!) {
                userContestRanking(username: $username) {
                    rating
                    globalRanking
                    attendedContestsCount
                }
            }`,
            variables: { username: handle }
        }, { headers: { 'Content-Type': 'application/json' } });

        const ranking = response.data?.data?.userContestRanking;
        if (!ranking) {
            // Either an invalid handle, or a valid one that's never entered a contest.
            return res.status(404).json({ error: "No contest rating found" });
        }

        console.log("✅ LeetCode Contest Success:", ranking.rating);
        res.json({
            rating: Math.round(ranking.rating) || 0,
            globalRanking: ranking.globalRanking || 0,
            attended: ranking.attendedContestsCount || 0
        });
    } catch (error) {
        console.error("❌ LeetCode Contest API Error:", error.response ? error.response.status : error.message);
        res.status(500).json({ error: "Failed to fetch LeetCode contest rating" });
    }
});

// GFG PROXY ROUTE (gfg-stats.vercel.app was decommissioned; using GFG's own public profile-info API)
app.get('/api/gfg/:handle', async (req, res) => {
    try {
        const { handle } = req.params;
        console.log(`🔍 Fetching GFG stats for: ${handle}`);

        const response = await axios.get(`https://authapi.geeksforgeeks.org/api-get/user-profile-info/?handle=${handle}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.data || !response.data.data) {
            console.log("❌ GFG User Not Found or API Error");
            return res.status(404).json({ error: "User not found" });
        }

        const stats = response.data.data;

        console.log("✅ GFG Success:", stats.total_problems_solved);
        res.json({
            // Ensure we handle cases where data might be a string or number
            solved: parseInt(stats.total_problems_solved) || 0,
            score: parseInt(stats.score) || 0
        });
    } catch (error) {
        // Log the specific error to help debugging
        console.error("❌ GFG API Error:", error.response ? error.response.status : error.message);
        // authapi.geeksforgeeks.org returns 400 for an unknown handle
        if (error.response && error.response.status === 400) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(500).json({ error: "Failed to fetch GFG stats" });
    }
});

// ATCODER PROXY ROUTE (atcoder.jp has no CORS headers, so browsers can't call it directly)
app.get('/api/atcoder/:handle', async (req, res) => {
    try {
        const { handle } = req.params;
        console.log(`🔍 Fetching AtCoder stats for: ${handle}`);

        // AtCoder's JSON history endpoint only exposes per-contest placement, not the
        // user's overall global rank, so we scrape the "Rank" field off the profile page.
        const response = await axios.get(`https://atcoder.jp/users/${handle}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const html = response.data;

        const ratingMatch = html.match(/<th class="no-break">Rating<\/th><td>.*?user-[a-z]+'>(\d+)</s);
        if (!ratingMatch) {
            return res.status(404).json({ error: "User not found" });
        }
        const rankMatch = html.match(/Rank<\/th><td>([\d,]+)/);

        const rating = parseInt(ratingMatch[1]) || 0;
        const rank = rankMatch ? parseInt(rankMatch[1].replace(/,/g, '')) : 0;

        // AtCoder Problems (community-run, third-party) tracks accepted-problem counts,
        // which AtCoder's own site/API doesn't expose directly.
        let solved = 0;
        try {
            const acRankRes = await axios.get(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user=${handle}`);
            solved = acRankRes.data?.count || 0;
        } catch (e) { /* non-fatal: leave solved at 0 */ }

        console.log("✅ AtCoder Success:", rating);
        res.json({ rating, rank, solved });
    } catch (error) {
        console.error("❌ AtCoder API Error:", error.response ? error.response.status : error.message);
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(500).json({ error: "Failed to fetch AtCoder stats" });
    }
});

// CODECHEF PROXY ROUTE (codechef-stats.tashif.codes has no CORS headers)
app.get('/api/codechef/:handle', async (req, res) => {
    try {
        const { handle } = req.params;
        console.log(`🔍 Fetching CodeChef stats for: ${handle}`);

        const response = await axios.get(`https://codechef-stats.tashif.codes/${handle}`);

        if (!response.data || response.data.status !== 'success') {
            return res.status(404).json({ error: "User not found" });
        }

        const stats = response.data.data;

        // This API returns HTTP 200 "success" even for a handle that doesn't exist,
        // just with every field blank/zero — treat that shape as "not found" too.
        if (stats.currentRating === null && stats.totalSolved === 0 && stats.totalActiveDays === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        console.log("✅ CodeChef Success:", stats.currentRating);
        res.json({
            rating: parseInt(stats.currentRating) || 0,
            maxRating: parseInt(stats.maxRating) || 0,
            solved: parseInt(stats.totalSolved) || 0,
            stars: stats.rank || 'N/A'
        });
    } catch (error) {
        console.error("❌ CodeChef API Error:", error.response ? error.response.status : error.message);
        res.status(500).json({ error: "Failed to fetch CodeChef stats" });
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

if (require.main === module) {
    app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
    // Local/self-hosted dev convenience: on Vercel this won't run persistently,
    // so production relies on /api/cron/check-alarms being hit externally.
    cron.schedule('* * * * *', checkAndSendAlarms);
}

module.exports = app;