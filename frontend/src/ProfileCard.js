import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://algo-cal.vercel.app";

function ProfileCard({ handles, onEdit }) {
  const [stats, setStats] = useState({
    codeforces: { rating: 'N/A', rank: 'N/A', solved: 0 },
    leetcode: { solved: 'N/A', ranking: 'N/A', contestRating: 'N/A' },
    geeksforgeeks: { solved: 'N/A', score: 'N/A' },
    atcoder: { rating: 'N/A', rank: 'N/A', solved: 0 },
    codechef: { rating: 'N/A', stars: 'N/A', solved: 0 },
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!handles) return;
    fetchStats();
    // fetchStats is intentionally excluded: it's redefined every render and reads
    // `stats` via closure, so depending on it would refetch on every render instead
    // of only when the handles actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handles]);

  // Returns a user-facing message for a failed platform fetch, distinguishing
  // "handle doesn't exist" (404) from other failures (network/API down).
  const describeError = (e) => e?.response?.status === 404 ? "User not found" : "Couldn't load stats";

  const fetchStats = async () => {
    setLoading(true);
    const newStats = { ...stats };
    const newErrors = {};

    // 1. Codeforces
    if (handles.codeforces) {
        try {
            const cfRes = await axios.get(`https://codeforces.com/api/user.info?handles=${handles.codeforces}`);
            if (cfRes.data.status === 'OK') {
                // user.info resolves old/renamed handles to the current one, but
                // user.status requires the current handle and 404s on a stale one —
                // so always look up submissions using the resolved handle.
                const currentHandle = cfRes.data.result[0].handle;

                // user.status (submissions) is a separate call, so a solved-count
                // failure shouldn't wipe out the rating/rank we already have.
                let solved = 0;
                try {
                    const statusRes = await axios.get(`https://codeforces.com/api/user.status?handle=${currentHandle}`);
                    if (statusRes.data.status === 'OK') {
                        const solvedSet = new Set();
                        statusRes.data.result.forEach(s => {
                            if (s.verdict === 'OK') solvedSet.add(`${s.problem.contestId}${s.problem.index}`);
                        });
                        solved = solvedSet.size;
                    }
                } catch (e) { /* non-fatal */ }

                newStats.codeforces = {
                    rating: cfRes.data.result[0].rating || 'N/A',
                    rank: cfRes.data.result[0].maxRating || 'N/A',
                    solved
                };
            } else {
                newErrors.codeforces = "User not found";
            }
        } catch(e) { newErrors.codeforces = "User not found"; }
    }

    // 2. LeetCode
    if (handles.leetcode) {
        try {
            const lcRes = await axios.get(`https://leetcode-api-faisalshohag.vercel.app/${handles.leetcode}`);
            if (lcRes.data.totalSolved !== undefined) {
                // Contest rating is a separate call (backend proxy), so a user who's
                // valid but never entered a contest shouldn't error the whole card.
                let contestRating = 'N/A';
                try {
                    const contestRes = await axios.get(`${API_BASE}/api/leetcode-contest/${handles.leetcode}`);
                    contestRating = contestRes.data.rating || 'N/A';
                } catch (e) { /* non-fatal: handle may just have no contest history */ }

                newStats.leetcode = {
                    solved: lcRes.data.totalSolved,
                    ranking: lcRes.data.ranking,
                    contestRating
                };
            } else {
                newErrors.leetcode = "User not found";
            }
        } catch(e) { newErrors.leetcode = describeError(e); }
    }

    // 3. GeeksforGeeks (Using LOCAL Backend Proxy)
    if (handles.geeksforgeeks) {
        try {
            const gfgRes = await axios.get(`${API_BASE}/api/gfg/${handles.geeksforgeeks}`);
            newStats.geeksforgeeks = {
                solved: gfgRes.data.solved || 'N/A',
                score: gfgRes.data.score || 'N/A'
            };
        } catch(e) {
            console.error("GFG Fetch Error", e);
            newErrors.geeksforgeeks = describeError(e);
        }
    }

    // 4. AtCoder (Using LOCAL Backend Proxy)
    if (handles.atcoder) {
        try {
            const acRes = await axios.get(`${API_BASE}/api/atcoder/${handles.atcoder}`);
            newStats.atcoder = {
                rating: acRes.data.rating || 'N/A',
                rank: acRes.data.rank || 'N/A',
                solved: acRes.data.solved || 0
            };
        } catch(e) {
            console.error("AtCoder Fetch Error", e);
            newErrors.atcoder = describeError(e);
        }
    }

    // 5. CodeChef (Using LOCAL Backend Proxy)
    if (handles.codechef) {
        try {
            const ccRes = await axios.get(`${API_BASE}/api/codechef/${handles.codechef}`);
            newStats.codechef = {
                rating: ccRes.data.rating || 'N/A',
                stars: ccRes.data.stars || 'N/A',
                solved: ccRes.data.solved || 0
            };
        } catch(e) {
            console.error("CodeChef Fetch Error", e);
            newErrors.codechef = describeError(e);
        }
    }

    setStats(newStats);
    setErrors(newErrors);
    setLoading(false);
  };

  if (!handles) return null;

  const totalSolved = (Number(stats.codeforces.solved) || 0)
    + (Number(stats.leetcode.solved) || 0)
    + (Number(stats.geeksforgeeks.solved) || 0)
    + (Number(stats.atcoder.solved) || 0)
    + (Number(stats.codechef.solved) || 0);

  return (
    <div className="w-full bg-slate-900 border-t border-slate-800 p-4 mt-6 rounded-xl shadow-2xl relative">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <h2 className="text-base font-bold text-white">Live Stats</h2>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            <div className="flex items-baseline gap-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1">
              <span className="text-lg font-extrabold text-blue-300">{totalSolved}</span>
              <span className="text-[10px] font-bold uppercase text-blue-400/80">Problems Solved</span>
            </div>
          )}
          <button onClick={onEdit} className="text-slate-500 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg transition-all text-xs font-bold flex items-center gap-1 whitespace-nowrap">
            ⚙️ Edit Handles
          </button>
        </div>
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
            error={errors.codeforces}
        >
            <StatRow label="Solved" value={loading ? '...' : stats.codeforces.solved} color="text-white"/>
            <StatRow label="Rating" value={loading ? '...' : stats.codeforces.rating} color="text-slate-400"/>
        </StatBox>

        {/* LeetCode */}
        <StatBox 
            platform="LeetCode"
            icon="https://upload.wikimedia.org/wikipedia/commons/1/19/LeetCode_logo_black.png"
            handle={handles.leetcode}
            url={`https://leetcode.com/u/${handles.leetcode}`}
            color="text-orange-500"
            onClick={onEdit}
            error={errors.leetcode}
        >
            <StatRow label="Solved" value={loading ? '...' : stats.leetcode.solved} color="text-white"/>
            <StatRow label="Contest Rating" value={loading ? '...' : stats.leetcode.contestRating} color="text-slate-400"/>
        </StatBox>

        {/* GeeksForGeeks */}
        <StatBox 
            platform="GeeksForGeeks"
            icon="https://upload.wikimedia.org/wikipedia/commons/4/43/GeeksforGeeks.svg"
            handle={handles.geeksforgeeks}
            url={`https://www.geeksforgeeks.org/user/${handles.geeksforgeeks}/`}
            color="text-green-500"
            onClick={onEdit}
            error={errors.geeksforgeeks}
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
            error={errors.atcoder}
        >
            <StatRow label="Solved" value={loading ? '...' : stats.atcoder.solved} color="text-white"/>
            <StatRow label="Rating" value={loading ? '...' : stats.atcoder.rating} color="text-slate-400"/>
        </StatBox>

        {/* CodeChef */}
        <StatBox
            platform="CodeChef"
            icon="https://avatars.githubusercontent.com/u/11960354?v=4"
            handle={handles.codechef}
            url={`https://www.codechef.com/users/${handles.codechef}`}
            color="text-red-500"
            onClick={onEdit}
            error={errors.codechef}
        >
            <StatRow label="Solved" value={loading ? '...' : stats.codechef.solved} color="text-white"/>
            <StatRow label="Rating" value={loading ? '...' : stats.codechef.rating} color="text-slate-400"/>
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

function StatBox({ platform, icon, handle, url, color, children, onClick, error }) {
    if (!handle) {
        return (
            <div onClick={onClick} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-800 transition-all opacity-50 hover:opacity-100 h-20">
                <img src={icon} className="w-4 h-4 grayscale" alt="" />
                <span className="text-xs font-bold text-slate-400">+ Link {platform}</span>
            </div>
        );
    }

    if (error) {
        return (
            <div onClick={onClick} className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 flex flex-col justify-between cursor-pointer hover:bg-red-950/50 transition-all h-24">
                <div className="flex items-center gap-2 mb-2">
                    <img src={icon} className="w-5 h-5 object-contain grayscale opacity-60" alt={platform} />
                    <div className="text-xs font-bold uppercase truncate text-slate-400">
                        {handle}
                    </div>
                </div>
                <div className="text-[11px] font-semibold text-red-400">⚠ {error}</div>
                <div className="text-[10px] text-slate-500">Click to fix in Edit Handles</div>
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