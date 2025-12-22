import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import axios from 'axios';
import LoginModal from './LoginModal';
import AddEventModal from './AddEventModal';
import SettingsModal from './SettingsModal';
import ProfileCard from './ProfileCard';
import Footer from './Footer';

// --- CONFIGURATION ---
// 👇 THIS IS THE KEY CHANGE
// If we are on your computer, use localhost. If on the web, use your Vercel Backend.
const API_BASE = window.location.hostname === "localhost" 
  ? "http://localhost:5000" 
  : "https://algo-cal.vercel.app"; 

// --- ASSETS ---
const logos = {
  codeforces: "https://cdn.iconscout.com/icon/free/png-256/free-codeforces-3628695-3029920.png",
  leetcode: "https://upload.wikimedia.org/wikipedia/commons/1/19/LeetCode_logo_black.png",
  atcoder: "https://img.atcoder.jp/assets/atcoder.png",
  codechef: "https://avatars.githubusercontent.com/u/11960354?v=4",
  other: "https://cdn-icons-png.flaticon.com/512/921/921606.png"
};

function App() {
  const [events, setEvents] = useState([]); 
  const [personalEvents, setPersonalEvents] = useState([]); 
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
  const [user, setUser] = useState(null);
  const [alarms, setAlarms] = useState([]); 
  const [handles, setHandles] = useState(null);

  const [filters, setFilters] = useState({
    codeforces: true, leetcode: true, atcoder: true, codechef: true, other: true
  });

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    if (Notification.permission !== "granted") Notification.requestPermission();

    const token = localStorage.getItem('token');
    const savedEmail = localStorage.getItem('userEmail');

    if (token && savedEmail) {
      setUser(savedEmail);
      // 👇 Updated to use API_BASE
      axios.get(`${API_BASE}/api/user`, { headers: { 'x-auth-token': token } })
        .then(res => {
          if (res.data.filters) setFilters(res.data.filters);
          if (res.data.alarms) setAlarms(res.data.alarms.map(a => a.contestId));
          if (res.data.personalEvents) setPersonalEvents(res.data.personalEvents);
          if (res.data.handles) setHandles(res.data.handles); 
        })
        .catch(err => console.error("Session error", err));
    }

    // 👇 Updated to use API_BASE
    axios.get(`${API_BASE}/api/contests`)
      .then((response) => setEvents(response.data))
      .catch((error) => console.error("Error:", error));
  }, []);

  // --- 2. ALARM CHECKER ---
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      events.forEach(event => {
        if (alarms.includes(event.id)) {
          const startTime = new Date(event.start);
          const timeDiff = startTime - now;
          const minutesLeft = Math.floor(timeDiff / 1000 / 60);

          if (minutesLeft === 15) {
            new Notification("Contest Starting Soon!", {
              body: `${event.title} starts in 15 minutes!`,
              icon: logos[event.extendedProps.platform]
            });
          }
        }
      });
    };
    checkAlarms();
    const interval = setInterval(checkAlarms, 60000);
    return () => clearInterval(interval);
  }, [alarms, events]);

  // --- 3. ACTIONS ---
  const handleLoginSuccess = (email, savedFilters, savedAlarms, savedPersonalEvents, savedHandles) => {
    setUser(email);
    if (savedFilters) setFilters(savedFilters);
    if (savedAlarms) setAlarms(savedAlarms.map(a => a.contestId));
    if (savedPersonalEvents) setPersonalEvents(savedPersonalEvents);
    if (savedHandles) setHandles(savedHandles);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setUser(null);
    setAlarms([]);
    setPersonalEvents([]);
    setHandles(null);
    setFilters({ codeforces: true, leetcode: true, atcoder: true, codechef: true, other: true });
  };

  const toggleAlarm = (contestId, title, start) => {
    if (!user) { setIsLoginOpen(true); return; }
    const token = localStorage.getItem('token');
    const isAlarmSet = alarms.includes(contestId);
    setAlarms(isAlarmSet ? alarms.filter(id => id !== contestId) : [...alarms, contestId]);
    // 👇 Updated to use API_BASE
    axios.post(`${API_BASE}/api/alarms`, { contestId, title, start }, { headers: { 'x-auth-token': token } });
  };

  const handleFilterChange = (platform) => {
    const newFilters = { ...filters, [platform]: !filters[platform] };
    setFilters(newFilters);
    const token = localStorage.getItem('token');
    if (user && token) {
      // 👇 Updated to use API_BASE
      axios.post(`${API_BASE}/api/filters`, { filters: newFilters }, { headers: { 'x-auth-token': token } });
    }
  };

  const handleAddEvent = (eventData) => {
    if (!user) { setIsLoginOpen(true); return; }
    const newEvent = {
      id: Date.now().toString(), 
      title: eventData.title,
      start: eventData.start,
      allDay: false,
      color: '#8b5cf6', 
      extendedProps: { isPersonal: true }
    };
    setPersonalEvents([...personalEvents, newEvent]);
    const token = localStorage.getItem('token');
    // 👇 Updated to use API_BASE
    axios.post(`${API_BASE}/api/personal-events`, newEvent, { headers: { 'x-auth-token': token } });
  };

  const handleSaveHandles = (newHandles) => {
    setHandles(newHandles);
    const token = localStorage.getItem('token');
    // 👇 Updated to use API_BASE
    axios.post(`${API_BASE}/api/handles`, { handles: newHandles }, { headers: { 'x-auth-token': token } });
  };

  const handleEventClick = (info) => {
    info.jsEvent.preventDefault();
    if (info.event.url) { window.open(info.event.url, "_blank"); return; }
    if (info.event.extendedProps.isPersonal) {
      const confirmDelete = window.confirm(`Delete event "${info.event.title}"?`);
      if (confirmDelete) {
        setPersonalEvents(personalEvents.filter(e => e.id !== info.event.id));
        const token = localStorage.getItem('token');
        // 👇 Updated to use API_BASE
        axios.delete(`${API_BASE}/api/personal-events/${info.event.id}`, { headers: { 'x-auth-token': token } });
      }
    }
  };

  const filteredContests = events.filter(e => filters[e.extendedProps.platform]);
  const allCalendarEvents = [...filteredContests, ...personalEvents];
  const now = new Date();
  const upcomingEvents = filteredContests.filter(e => new Date(e.start) > now).sort((a, b) => new Date(a.start) - new Date(b.start)).slice(0, 10);

  const renderCalendarEvent = (eventInfo) => {
    const platform = eventInfo.event.extendedProps.platform;
    const isPersonal = eventInfo.event.extendedProps.isPersonal;
    if (isPersonal) {
      return (
        <div className="flex items-center w-full overflow-hidden py-0.5 px-1">
          <span className="truncate font-bold text-xs md:text-sm text-white">{eventInfo.event.title}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center w-full overflow-hidden py-0.5">
        {logos[platform] && <img src={logos[platform]} alt="" className="w-4 h-4 mr-1.5 rounded-sm bg-white p-[1px]" />}
        <span className="truncate font-semibold text-xs md:text-sm">{eventInfo.event.title}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      
      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-grow p-4 md:p-6 flex flex-col gap-6">

        {/* HEADER */}
        <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">AlgoCal</h1>
              <p className="text-slate-400 text-sm">Master your contest schedule</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
              {Object.keys(filters).map(p => (
                <FilterButton key={p} platform={p} active={filters[p]} onClick={() => handleFilterChange(p)} />
              ))}
            </div>
            
            {user ? (
              <button onClick={handleLogout} className="px-5 py-2 bg-slate-800 hover:bg-red-900/30 text-white text-sm font-bold rounded-lg border border-slate-700 transition-colors">Log Out</button>
            ) : (
              <button onClick={() => setIsLoginOpen(true)} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all">Log In</button>
            )}
          </div>
        </div>

        {/* GRID LAYOUT */}
        <div className="max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-grow">
          
          {/* LEFT SIDEBAR */}
          <div className="lg:col-span-3 flex flex-col gap-5"> 
              <button 
                onClick={() => user ? setIsAddEventOpen(true) : setIsLoginOpen(true)}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>+</span> Add Personal Event
              </button>

              <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[750px]">
                  <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                          Upcoming
                      </h2>
                  </div>
                  
                  <div className="overflow-y-auto p-3 space-y-3 custom-scrollbar">
                      {upcomingEvents.length === 0 ? (
                          <div className="text-center py-10 text-slate-500 text-sm">No upcoming contests.</div>
                      ) : (
                          upcomingEvents.map((event, idx) => {
                              const isAlarmSet = alarms.includes(event.id);
                              const date = new Date(event.start);
                              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                              
                              return (
                                  <div key={idx} className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all group relative">
                                      <div className="flex justify-between items-start mb-1.5">
                                          <div className="flex items-center gap-2">
                                              <img src={logos[event.extendedProps.platform]} alt="" className="w-6 h-6 bg-white rounded-md p-0.5" />
                                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{event.extendedProps.platform}</span>
                                          </div>
                                          <button onClick={() => toggleAlarm(event.id, event.title, event.start)} className={`p-1.5 rounded-md transition-all ${isAlarmSet ? 'bg-yellow-500/10 text-yellow-400' : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'}`}>
                                              {isAlarmSet ? '🔔' : '🔕'}
                                          </button>
                                      </div>
                                      <a href={event.url} target="_blank" rel="noreferrer" className="block">
                                          <h3 className="text-sm font-semibold text-slate-200 leading-snug mb-1 hover:text-blue-400 transition-colors">{event.title}</h3>
                                          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                                              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">{dateStr}</span>
                                              <span className="text-slate-600">at</span>
                                              <span className="text-blue-300">{timeStr}</span>
                                          </div>
                                      </a>
                                  </div>
                              );
                          })
                      )}
                  </div>
              </div>
          </div>

          {/* RIGHT CALENDAR */}
          <div className="lg:col-span-9 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
              <FullCalendar
                  plugins={[ dayGridPlugin ]}
                  initialView="dayGridMonth"
                  events={allCalendarEvents}
                  height="auto"
                  dayMaxEvents={3}
                  eventDisplay="block"
                  headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
                  eventDidMount={(info) => { info.el.title = info.event.title; }}
                  eventContent={renderCalendarEvent}
                  eventClick={handleEventClick} 
              />
          </div>

        </div>

        {/* PROFILE CARD AT BOTTOM */}
        <div className="max-w-[1600px] mx-auto w-full">
          {user && (
              <ProfileCard 
                handles={handles} 
                onEdit={() => setIsSettingsOpen(true)} 
              />
          )}
        </div>

      </div>

      {/* FOOTER */}
      <Footer />

      {isLoginOpen && <LoginModal onClose={() => setIsLoginOpen(false)} onLoginSuccess={(email, f, a, p, h) => handleLoginSuccess(email, f, a, p, h)} />}
      {isAddEventOpen && <AddEventModal onClose={() => setIsAddEventOpen(false)} onAdd={handleAddEvent} />}
      {isSettingsOpen && <SettingsModal currentHandles={handles} onClose={() => setIsSettingsOpen(false)} onSave={handleSaveHandles} />}
    </div>
  );
}

function FilterButton({ platform, active, onClick }) {
    const logos = {
      codeforces: "https://cdn.iconscout.com/icon/free/png-256/free-codeforces-3628695-3029920.png",
      leetcode: "https://upload.wikimedia.org/wikipedia/commons/1/19/LeetCode_logo_black.png",
      atcoder: "https://img.atcoder.jp/assets/atcoder.png",
      codechef: "https://avatars.githubusercontent.com/u/11960354?v=4",
      other: "https://cdn-icons-png.flaticon.com/512/921/921606.png"
    };
    return (
      <button onClick={onClick} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${active ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' : 'opacity-40 grayscale text-slate-500 hover:opacity-70'}`}>
        <img src={logos[platform]} alt="" className="w-5 h-5 object-contain" />
        <span className="hidden xl:inline">{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
        <span className="xl:hidden">{platform.slice(0,2).toUpperCase()}</span>
      </button>
    );
}

export default App;