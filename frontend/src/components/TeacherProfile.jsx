import React, { useState } from 'react';

export default function TeacherProfile({ teacher, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open teacher profile"
        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-blue-700 bg-blue-100 text-lg font-bold text-blue-700 transition hover:bg-blue-200"
      >
        {teacher.name?.charAt(0).toUpperCase()}
      </button>

      {isOpen && (
        <section className="absolute right-0 top-14 z-10 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <h3 className="mb-2 text-lg font-bold text-slate-800">Teacher Profile</h3>
          <p className="my-2 font-bold text-slate-800">{teacher.name}</p>
          <p className="my-2 text-xs text-slate-600">{teacher.email}</p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-2 w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Log Out
          </button>
        </section>
      )}
    </div>
  );
}
