# 🚀 AlgoCal - Competitive Programming Contest Tracker

![MERN Stack](https://img.shields.io/badge/MERN-Stack-000000?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)

**AlgoCal** is a full-stack web application designed for competitive programmers to track upcoming contests, manage schedules, and view rating statistics across multiple platforms in one unified dashboard.

🔗 **Live Demo:** [https://algocal.vercel.app](https://algocal.vercel.app)

---

## ✨ Key Features

* **📅 Unified Calendar:** Aggregates contest schedules from Codeforces, LeetCode, AtCoder, CodeChef, and GeeksForGeeks using the Clist API.
* **🔔 Contest Reminders:** Set custom alarms/browser notifications 15 minutes before contests start.
* **📊 Live Rating Dashboard:** View real-time user ratings, global ranks, and solved problem counts across platforms.
* **🛠 Custom Filtering:** Toggle specific platforms on/off to declutter the calendar.
* **🔐 User Authentication:** Secure JWT-based login and registration system.
* **✏️ Personal Schedule:** Add custom personal events directly to the contest calendar.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | React 19, Tailwind CSS, FullCalendar, Axios |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **Authentication** | JSON Web Tokens (JWT), BCrypt |
| **Deployment** | Vercel (Frontend & Backend) |

---

## 📂 Project Structure

```text
AlgoCal/
├── backend/            # Express Server & API Routes
│   ├── models/         # MongoDB Schemas (User, Alarm)
│   ├── routes/         # Auth, User, and Contest Routes
│   ├── server.js       # Entry point
│   └── package.json
├── frontend/           # React Client Application
│   ├── src/
│   │   ├── components/ # Modals, Calendar, ProfileCard
│   │   ├── App.js      # Main Router & Logic
│   │   └── index.css   # Tailwind Imports
│   └── package.json
└── README.md           # Documentation