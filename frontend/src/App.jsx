import React, { useEffect, useState } from 'react';
import LecturerPanel from './components/LecturerPanel';
import StudentPanel from './components/StudentPanel';
import TeacherProfile from './components/TeacherProfile';
import AdminPanel from './components/AdminPanel';
import { API_BASE_URL } from './api';

const homePathByRole = {
  student: '/student',
  teacher: '/teacher',
  admin: '/admin'
};

function readStoredUser() {
  try {
    const savedUser = JSON.parse(localStorage.getItem('attendance_user'));
    if (savedUser && homePathByRole[savedUser.role]) return savedUser;

    const savedTeacher = JSON.parse(localStorage.getItem('attendance_teacher'));
    return savedTeacher ? { ...savedTeacher, role: 'teacher' } : null;
  } catch {
    return null;
  }
}

function LoginPage({ onAuthenticated }) {
  const [role, setRole] = useState('student');
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', student_code: '', activation_code: '', password: '' });
  const [feedback, setFeedback] = useState(null);
  const isSignup = mode === 'signup' && (role === 'teacher' || role === 'student');

  const handleRoleChange = (event) => {
    const nextRole = event.target.value;
    setRole(nextRole);
    setMode('login');
    setFeedback(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback(null);
    const endpoint = role === 'teacher'
      ? 'lecturer'
      : role === 'student'
        ? 'student'
        : 'admin';
    const action = isSignup ? 'signup' : 'login';

    try {
      const response = await fetch(`${API_BASE_URL}/api/${endpoint}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Unable to sign in.');

      if (isSignup) {
        setMode('login');
        setForm({ ...form, name: '', activation_code: '', password: '' });
        setFeedback({
          success: true,
          message: role === 'student'
            ? 'Account activated. Sign in to continue.'
            : 'Account created. Sign in to continue.'
        });
        return;
      }

      const account = data[role];
      if (!account) throw new Error('The server returned an invalid account.');
      if (role === 'admin' && !data.token) throw new Error('The server did not return an admin session.');
      onAuthenticated({ ...account, role, ...(role === 'admin' ? { token: data.token } : {}) });
    } catch (error) {
      setFeedback({ success: false, message: error.message });
    }
  };

  return (
    <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-2xl font-bold text-slate-800">
        {isSignup && role === 'student' ? 'Activate your account' : isSignup ? 'Create your account' : 'Sign in'}
      </h3>
      <p className="mt-2 text-sm text-slate-600">
        {isSignup && role === 'student'
          ? 'Enter the details and one-time code provided by your school admin, then choose a password.'
          : 'Use your account details to open your attendance portal.'}
      </p>
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Role
          <select
            value={role}
            onChange={handleRoleChange}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        {isSignup && role === 'teacher' && (
          <input
            type="text"
            placeholder="Full name"
            aria-label="Full name"
            autoComplete="name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        )}

        <input
          type="email"
          placeholder="Email"
          aria-label="Email"
          autoComplete="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
          className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        {role === 'student' && (
          <input
            type="text"
            placeholder="KPTMYK student code"
            aria-label="KPTMYK student code"
            autoComplete="username"
            value={form.student_code}
            onChange={(event) => setForm({ ...form, student_code: event.target.value })}
            required
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        )}

        {isSignup && role === 'student' && (
          <input
            type="text"
            placeholder="One-time activation code"
            aria-label="One-time activation code"
            autoComplete="off"
            value={form.activation_code}
            onChange={(event) => setForm({ ...form, activation_code: event.target.value })}
            required
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        )}

        <input
          type="password"
          placeholder="Password (at least 6 characters)"
          aria-label="Password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          minLength={isSignup ? 6 : undefined}
          required
          className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <button
          type="submit"
          className="mt-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
        >
          {isSignup && role === 'student' ? 'Activate Account' : isSignup ? 'Create Account' : 'Log In'}
        </button>
      </form>

      {feedback && (
        <p className={`mt-4 text-sm font-semibold ${feedback.success ? 'text-emerald-700' : 'text-red-600'}`} role="status">
          {feedback.message}
        </p>
      )}

      {(role === 'teacher' || role === 'student') && (
        <button
          type="button"
          onClick={() => {
            setMode(isSignup ? 'login' : 'signup');
            setFeedback(null);
          }}
          className="mt-4 text-sm font-medium text-blue-700 underline-offset-2 hover:underline"
        >
          {isSignup
            ? 'Already have an account? Sign in'
            : role === 'student' ? 'Have an activation code? Activate your account' : 'Need an account? Sign up'}
        </button>
      )}
      {role === 'student' && (
        <p className="mt-4 text-sm text-slate-500">
          {isSignup
            ? 'No activation code? Contact your school admin.'
            : 'Your school admin must add you and give you an activation code before you can sign in.'}
        </p>
      )}
      {role === 'admin' && (
        <p className="mt-4 text-sm text-slate-500">Admin accounts are created by an authorized operator.</p>
      )}
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState(readStoredUser);
  const [viewRole, setViewRole] = useState(() => readStoredUser()?.role || 'login');

  useEffect(() => {
    const expectedView = user?.role || 'login';
    const expectedPath = homePathByRole[expectedView] || '/login';
    if (window.location.pathname !== expectedPath) {
      window.history.replaceState(null, '', expectedPath);
    }

    const handlePopState = () => {
      setViewRole(user?.role || 'login');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  const changeView = (nextView) => {
    setViewRole(nextView);
    const nextPath = homePathByRole[nextView] || '/login';
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
  };

  const handleAuthenticated = (authenticatedUser) => {
    setUser(authenticatedUser);
    localStorage.setItem('attendance_user', JSON.stringify(authenticatedUser));
    localStorage.removeItem('attendance_teacher');
    changeView(authenticatedUser.role);
  };

  const handleLogout = () => {
    localStorage.removeItem('attendance_user');
    localStorage.removeItem('attendance_teacher');
    setUser(null);
    changeView('login');
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">Polytechnic University (Myeik) — Attendance Portal</h2>
          <p className="mt-1 text-sm text-slate-600">Simple, reliable attendance management for classes.</p>
        </div>
        {user && (
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <span className="text-sm font-medium text-slate-700">{user.name} · {user.role}</span>
            {user.role === 'teacher'
              ? <TeacherProfile teacher={user} onLogout={handleLogout} />
              : (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Log Out
                </button>
              )}
          </div>
        )}
      </header>

      <main className="mt-7 grid gap-6">
        {viewRole === 'teacher' && user?.role === 'teacher' ? (
          <LecturerPanel teacher={user} />
        ) : viewRole === 'student' && user?.role === 'student' ? (
          <StudentPanel student={user} />
        ) : viewRole === 'admin' && user?.role === 'admin' ? (
          <AdminPanel admin={user} />
        ) : (
          <LoginPage onAuthenticated={handleAuthenticated} />
        )}
      </main>
    </div>
  );
}
