import React, { useEffect, useState } from 'react';
import LecturerPanel from './components/LecturerPanel';
import StudentPanel from './components/StudentPanel';
import Timetable from './components/Timetable';
import TeacherProfile from './components/TeacherProfile';
import { API_BASE_URL } from './api';
import './app.css';

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
      onAuthenticated(data.teacher);
    } catch (error) {
      setFeedback(error.message);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '40px auto', padding: '24px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '6px' }}>
      <h3>{mode === 'login' ? 'Teacher Login' : 'Create Teacher Account'}</h3>
      <p style={{ color: '#666' }}>Sign in to access the lecturer panel.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mode === 'signup' && <input type="text" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />}
        <input type="email" placeholder="Teacher email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input type="password" placeholder="Password (at least 6 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength="6" required />
        <button type="submit" style={{ padding: '12px', backgroundColor: '#0056b3', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
          {mode === 'login' ? 'Log In' : 'Sign Up'}
        </button>
      </form>
      {feedback && <p style={{ color: '#dc3545', fontWeight: 'bold' }}>{feedback}</p>}
      <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ marginTop: '16px', border: 'none', background: 'none', color: '#0056b3', cursor: 'pointer' }}>
        {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
      </button>
      <button type="button" onClick={onBack} style={{ display: 'block', marginTop: '10px', border: 'none', background: 'none', color: '#6c757d', cursor: 'pointer' }}>
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
    <div className="app-shell">
      <header className="site-header">
        <div className="brand-block">
          <h2>Polytechnic University (Myeik) — Attendance Portal</h2>
          <p>Simple, reliable attendance management for every class.</p>
        </div>
        <div className="site-nav">
          <button 
            onClick={() => changeView('student')} 
            style={{ padding: '8px 16px', marginRight: '8px', backgroundColor: viewRole === 'student' ? '#0056b3' : '#e0e0e0', color: viewRole === 'student' ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Student Panel
          </button>
          <button
            onClick={() => changeView(teacher ? 'lecturer' : 'teacher-access')}
            style={{ padding: '8px 16px', backgroundColor: viewRole === 'lecturer' || viewRole === 'teacher-access' ? '#0056b3' : '#e0e0e0', color: viewRole === 'lecturer' || viewRole === 'teacher-access' ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Lecturer Mode
          </button>
          {teacher && <TeacherProfile teacher={teacher} onTeacherUpdated={handleTeacherUpdated} onLogout={handleLogout} />}
        </div>
      </header>

      <main className="app-content">
        {viewRole === 'teacher-access' ? (
        <TeacherAccess onAuthenticated={handleAuthenticated} onBack={() => changeView('student')} />
        ) : viewRole === 'lecturer' ? (
        <LecturerPanel teacher={teacher} />
        ) : (
        <>
          <StudentPanel />
          <Timetable />
        </>
        )}
      </main>
    </div>
  );
}