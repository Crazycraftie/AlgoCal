import React, { useState } from 'react';
import axios from 'axios';

// 👇 THIS IS THE FIX.
// It tells the app: "If I am on the web, use the real server. If I am local, use localhost."
const API_BASE = window.location.hostname === "localhost" 
  ? "http://localhost:5000" 
  : "https://algo-cal.vercel.app"; 

function LoginModal({ onClose, onLoginSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // We use the smart API_BASE variable here
    const endpoint = isRegistering ? `${API_BASE}/api/register` : `${API_BASE}/api/login`;

    try {
      const res = await axios.post(endpoint, { email, password });
      
      if (isRegistering) {
        setIsRegistering(false);
        alert("Account created! Please log in.");
      } else {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userEmail', res.data.user.email);
        // This passes the data back to App.js
        onLoginSuccess(res.data.user.email, res.data.filters, res.data.alarms, res.data.personalEvents, res.data.handles);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-slate-900 p-8 rounded-xl border border-slate-700 w-96 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
        
        <h2 className="text-2xl font-bold text-white mb-6">
          {isRegistering ? "Create Account" : "Welcome Back"}
        </h2>

        {error && <p className="text-red-400 text-sm mb-4 bg-red-900/30 p-2 rounded">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input 
            type="email" 
            placeholder="Email address" 
            className="p-3 rounded bg-slate-800 border border-slate-700 text-white focus:border-blue-500 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="p-3 rounded bg-slate-800 border border-slate-700 text-white focus:border-blue-500 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white py-3 rounded font-bold transition-all mt-2">
            {isRegistering ? "Sign Up" : "Log In"}
          </button>
        </form>

        <div className="mt-6 text-center text-slate-400 text-sm">
          {isRegistering ? "Already have an account?" : "Don't have an account?"}
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-blue-400 ml-2 hover:underline font-medium">
            {isRegistering ? "Log In" : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;