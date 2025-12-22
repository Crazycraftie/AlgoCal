import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ProfileCard({ handles, onEdit }) {
  const [stats, setStats] = useState({
    codeforces: { rating: 'N/A', rank: 'N/A' },
    leetcode: { solved: 'N/A', ranking: 'N/A' },
    geeksforgeeks: { solved: 'N/A', score: 'N/A' },
    atcoder: { rating: 'N/A' },
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!handles) return;
    fetchStats();
  }, [handles]);

  const fetchStats = async () => {
    setLoading(true);
    const newStats = { ...stats };

    try {
      // 1. Codeforces
      if (handles.codeforces) {
        try {
            const cfRes = await axios.get(`https://codeforces.com/api/user.info?handles=${handles.codeforces}`);
            if (cfRes.data.status === 'OK') {
                newStats.codeforces = { 
                    rating: cfRes.data.result[0].rating || 'N/A',
                    rank: cfRes.data.result[0].maxRating || 'N/A'
                };
            }
        } catch(e) {}
      }

      // 2. LeetCode
      if (handles.leetcode) {
        try {
            const lcRes = await axios.get(`https://leetcode-stats-api.herokuapp.com/${handles.leetcode}`);
            if (lcRes.data.status === 'success') {
                newStats.leetcode = { 
                    solved: lcRes.data.totalSolved,
                    ranking: lcRes.data.ranking
                };
            }
        } catch(e) {}
      }

      // 3. GeeksforGeeks (Using LOCAL Backend Proxy)
      if (handles.geeksforgeeks) {
        try {
            const gfgRes = await axios.get(`http://localhost:5000/api/gfg/${handles.geeksforgeeks}`);
            if (gfgRes.data) {
                newStats.geeksforgeeks = {
                    solved: gfgRes.data.solved || 'N/A',
                    score: gfgRes.data.score || 'N/A'
                };
            }
        } catch(e) {
            console.error("GFG Fetch Error", e);
        }
      }

    } catch (err) { console.error(err); }

    setStats(newStats);
    setLoading(false);
  };

  if (!handles) return null;

  return (
    <div className="w-full bg-slate-900 border-t border-slate-800 p-4 mt-6 rounded-xl shadow-2xl relative">
      <button onClick={onEdit} className="absolute top-4 right-4 text-slate-500 hover:text-white bg-slate-800 p-1.5 rounded-lg transition-all z-10 text-xs font-bold flex items-center gap-1">
        ⚙️ Edit Handles
      </button>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">📊</span>
        <h2 className="text-base font-bold text-white">Live Stats</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Codeforces */}
        <StatBox 
            platform="Codeforces"
            icon="https://cdn.iconscout.com/icon/free/png-256/free-codeforces-3628695-3029920.png"
            handle={handles.codeforces}
            url={`https://codeforces.com/profile/${handles.codeforces}`}
            color="text-yellow-500"
            onClick={onEdit}
        >
            <StatRow label="Rating" value={loading ? '...' : stats.codeforces.rating} color="text-white"/>
            <StatRow label="Max Rating" value={loading ? '...' : stats.codeforces.rank} color="text-slate-400"/>
        </StatBox>

        {/* LeetCode */}
        <StatBox 
            platform="LeetCode"
            icon="https://upload.wikimedia.org/wikipedia/commons/1/19/LeetCode_logo_black.png"
            handle={handles.leetcode}
            url={`https://leetcode.com/u/${handles.leetcode}`}
            color="text-orange-500"
            onClick={onEdit}
        >
            <StatRow label="Solved" value={loading ? '...' : stats.leetcode.solved} color="text-white"/>
            <StatRow label="Global Rank" value={loading ? '...' : stats.leetcode.ranking} color="text-slate-400"/>
        </StatBox>

        {/* GeeksForGeeks */}
        <StatBox 
            platform="GeeksForGeeks"
            icon="https://upload.wikimedia.org/wikipedia/commons/4/43/GeeksforGeeks.svg"
            handle={handles.geeksforgeeks}
            url={`https://www.geeksforgeeks.org/user/${handles.geeksforgeeks}/`}
            color="text-green-500"
            onClick={onEdit}
        >
            <StatRow label="Solved" value={loading ? '...' : stats.geeksforgeeks.solved} color="text-white"/>
            <StatRow label="Coding Score" value={loading ? '...' : stats.geeksforgeeks.score} color="text-slate-400"/>
        </StatBox>

        {/* AtCoder */}
        <StatBox 
            platform="AtCoder"
            icon="https://img.atcoder.jp/assets/atcoder.png"
            handle={handles.atcoder}
            url={`https://atcoder.jp/users/${handles.atcoder}`}
            color="text-slate-300"
            onClick={onEdit}
        >
             <div className="text-[10px] text-slate-500 mt-2">View Profile ↗</div>
        </StatBox>

        {/* CodeChef */}
        <StatBox 
            platform="CodeChef"
            icon="https://avatars.githubusercontent.com/u/11960354?v=4"
            handle={handles.codechef}
            url={`https://www.codechef.com/users/${handles.codechef}`}
            color="text-red-500"
            onClick={onEdit}
        >
             <div className="text-[10px] text-slate-500 mt-2">View Profile ↗</div>
        </StatBox>

      </div>
    </div>
  );
}

function StatRow({ label, value, color }) {
    return (
        <div className="flex justify-between items-center w-full">
            <span className="text-[10px] text-slate-500 uppercase font-bold">{label}</span>
            <span className={`text-xs font-bold ${color}`}>{value}</span>
        </div>
    );
}

function StatBox({ platform, icon, handle, url, color, children, onClick }) {
    if (!handle) {
        return (
            <div onClick={onClick} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-800 transition-all opacity-50 hover:opacity-100 h-20">
                <img src={icon} className="w-4 h-4 grayscale" alt="" />
                <span className="text-xs font-bold text-slate-400">+ Link {platform}</span>
            </div>
        );
    }

    return (
        <a href={url} target="_blank" rel="noreferrer" className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 flex flex-col justify-between hover:border-slate-600 hover:bg-slate-800 transition-all group h-24">
            <div className="flex items-center gap-2 mb-2">
                <img src={icon} className="w-5 h-5 object-contain" alt={platform} />
                <div className={`text-xs font-bold uppercase truncate ${color} group-hover:underline`}>
                    {handle} <span className="text-[9px] text-slate-500 no-underline ml-1">↗</span>
                </div>
            </div>
            
            <div className="flex flex-col gap-1">
                {children}
            </div>
        </a>
    );
}

export default ProfileCard;