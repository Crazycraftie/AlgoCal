import React, { useState } from 'react';

function SettingsModal({ currentHandles, onClose, onSave }) {
  const [handles, setHandles] = useState(currentHandles || {
    codeforces: '', leetcode: '', atcoder: '', codechef: '', geeksforgeeks: ''
  });

  const handleChange = (e) => {
    setHandles({ ...handles, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(handles);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 w-96 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-white">✕</button>
        <h2 className="text-xl font-bold text-white mb-6">Link Your Profiles</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-4">
            <InputGroup name="codeforces" label="Codeforces Handle" value={handles.codeforces} onChange={handleChange} color="text-yellow-500" />
            <InputGroup name="leetcode" label="LeetCode Username" value={handles.leetcode} onChange={handleChange} color="text-orange-500" />
            <InputGroup name="geeksforgeeks" label="GeeksForGeeks Handle" value={handles.geeksforgeeks} onChange={handleChange} color="text-green-500" />
            <InputGroup name="atcoder" label="AtCoder User ID" value={handles.atcoder} onChange={handleChange} color="text-slate-200" />
            <InputGroup name="codechef" label="CodeChef Handle" value={handles.codechef} onChange={handleChange} color="text-red-500" />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold mt-2 transition-all">
            Save Profiles
          </button>
        </form>
      </div>
    </div>
  );
}

function InputGroup({ name, label, value, onChange, color }) {
  return (
    <div>
      <label className={`text-xs font-bold uppercase mb-1 block ${color}`}>{label}</label>
      <input 
        type="text" 
        name={name}
        value={value} 
        onChange={onChange}
        className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-blue-500 outline-none text-sm"
        placeholder="username"
      />
    </div>
  );
}

export default SettingsModal;