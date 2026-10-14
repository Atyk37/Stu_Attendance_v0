import React, { useEffect, useState } from 'react';
import LecturerPanel from './components/LecturerPanel';
import StudentPanel from './components/StudentPanel';
// import Timetable from './components/Timetable';
import TeacherProfile from './components/TeacherProfile';
import { API_BASE_URL } from './api';

function TeacherAccess({ onAuthenticated, onBack }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/lecturer/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to authenticate.');
      if (mode === 'signup') {
        setMode('login');
        setForm({ name: '', email: form.email, password: '' });
        setFeedback('Account created successfully. Please log in to continue.');
        return;
      }
      onAuthenticated(data.teacher);
    } catch (error) {
      setFeedback(error.message);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-2xl font-bold text-slate-800">{mode === 'login' ? 'Teacher Login' : 'Create Teacher Account'}</h3>
      <p className="mt-2 text-sm text-slate-600">Sign in to access the lecturer panel.</p>
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
        {mode === 'signup' && (
          <input
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        )}
        <input
          type="email"
          placeholder="Teacher email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <input
          type="password"
          placeholder="Password (at least 6 characters)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength="6"
          required
          className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <button
          type="submit"
          className="mt-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
        >
          {mode === 'login' ? 'Log In' : 'Sign Up'}
        </button>
      </form>
      {feedback && <p className="mt-4 text-sm font-semibold text-red-600">{feedback}</p>}
      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        className="mt-4 text-sm font-medium text-blue-700 underline-offset-2 hover:underline"
      >
        {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="mt-3 block text-sm text-slate-500 hover:text-slate-700"
      >
        Back to Student Panel
      </button>
    </div>
  );
}

function viewFromPath(pathname, teacher) {
  if (pathname === '/frontend/src/components/StudentPanel.jsx') return 'student';
  if (pathname === '/frontend/src/components/LecturerPanel.jsx') return teacher ? 'lecturer' : 'teacher-access';
  return null;
}

function pathForView(view) {
  return view === 'student'
    ? '/frontend/src/components/StudentPanel.jsx'
    : '/frontend/src/components/LecturerPanel.jsx';
}

export default function App() {
  const [teacher, setTeacher] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('attendance_teacher'));
    } catch {
      return null;
    }
  });
  const [viewRole, setViewRole] = useState(() => {
    const pathView = viewFromPath(window.location.pathname, teacher);
    if (pathView) return pathView;
    const savedView = localStorage.getItem('attendance_view_role');
    if (savedView === 'student') return 'student';
    return teacher ? 'lecturer' : 'student';
  });

  useEffect(() => {
    const currentPath = pathForView(viewRole);
    if (window.location.pathname !== currentPath) {
      window.history.replaceState(null, '', currentPath);
    }

    const handlePopState = () => {
      const nextView = viewFromPath(window.location.pathname, teacher) || 'student';
      setViewRole(nextView);
      localStorage.setItem('attendance_view_role', nextView);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [teacher, viewRole]);

  const changeView = (nextView) => {
    setViewRole(nextView);
    localStorage.setItem('attendance_view_role', nextView);
    const nextPath = pathForView(nextView);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
  };

  const handleAuthenticated = (signedInTeacher) => {
    setTeacher(signedInTeacher);
    localStorage.setItem('attendance_teacher', JSON.stringify(signedInTeacher));
    changeView('lecturer');
  };

  const handleTeacherUpdated = (updatedTeacher) => {
    setTeacher(updatedTeacher);
    localStorage.setItem('attendance_teacher', JSON.stringify(updatedTeacher));
  };

  const handleLogout = () => {
    localStorage.removeItem('attendance_teacher');
    setTeacher(null);
    changeView('student');
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">Polytechnic University (Myeik) — Attendance Portal</h2>
          <p className="mt-1 text-sm text-slate-600">Simple, reliable attendance management for classes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <button
            onClick={() => changeView('student')}
            className={
              viewRole === 'student'
                ? 'rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800'
                : 'rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300'
            }
          >
            Student Panel
          </button>
          <button
            onClick={() => changeView(teacher ? 'lecturer' : 'teacher-access')}
            className={
              viewRole === 'lecturer' || viewRole === 'teacher-access'
                ? 'rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800'
                : 'rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300'
            }
          >
            Lecturer Mode
          </button>
          {teacher && <TeacherProfile teacher={teacher} onTeacherUpdated={handleTeacherUpdated} onLogout={handleLogout} />}
        </div>
      </header>

      <main className="mt-7 grid gap-6">
        {viewRole === 'teacher-access' ? (
          <TeacherAccess onAuthenticated={handleAuthenticated} onBack={() => changeView('student')} />
        ) : viewRole === 'lecturer' ? (
          <LecturerPanel teacher={teacher} />
        ) : (
          <>
            <StudentPanel />
            {/* <Timetable /> */}
          </>
        )}
      </main>
    </div>
  );
}