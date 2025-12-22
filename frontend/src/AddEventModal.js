import React, { useState } from 'react';

function AddEventModal({ onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('12:00');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !date) return;
    
    // Combine date and time
    const fullStart = `${date}T${time}:00`;
    onAdd({ title, start: fullStart });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 w-80 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-white">✕</button>

        <h2 className="text-xl font-bold text-white mb-4">Add Personal Event</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Event Title</label>
            <input 
              type="text" 
              placeholder="e.g. Exam, Dinner..." 
              className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white outline-none focus:border-purple-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Date</label>
            <input 
              type="date" 
              className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white outline-none focus:border-purple-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Time</label>
            <input 
              type="time" 
              className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white outline-none focus:border-purple-500"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white py-2 rounded font-bold transition-all mt-2">
            Add to Calendar
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddEventModal;