import React, { useState } from 'react';
import LecturerPanel from './components/LecturerPanel';
import StudentPanel from './components/StudentPanel';
import Timetable from './components/Timetable';
import TeacherProfile from './components/TeacherProfile';

function TeacherAccess({ onAuthenticated, onBack }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const response = await fetch(`http://localhost:3000/api/lecturer/${mode}`, {
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

export default function App() {
  const [viewRole, setViewRole] = useState('student');
  const [teacher, setTeacher] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('attendance_teacher'));
    } catch {
      return null;
    }
  });

  const handleAuthenticated = (signedInTeacher) => {
    setTeacher(signedInTeacher);
    localStorage.setItem('attendance_teacher', JSON.stringify(signedInTeacher));
    setViewRole('lecturer');
  };

  const handleTeacherUpdated = (updatedTeacher) => {
    setTeacher(updatedTeacher);
    localStorage.setItem('attendance_teacher', JSON.stringify(updatedTeacher));
  };

  const handleLogout = () => {
    localStorage.removeItem('attendance_teacher');
    setTeacher(null);
    setViewRole('student');
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0056b3', paddingBottom: '12px' }}>
        <h2 style={{ margin: 0, color: '#0056b3' }}>Polytechnic University (Myeik) — Attendance Portal</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => setViewRole('student')} 
            style={{ padding: '8px 16px', marginRight: '8px', backgroundColor: viewRole === 'student' ? '#0056b3' : '#e0e0e0', color: viewRole === 'student' ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Student Panel
          </button>
          <button
            onClick={() => setViewRole(teacher ? 'lecturer' : 'teacher-access')}
            style={{ padding: '8px 16px', backgroundColor: viewRole === 'lecturer' || viewRole === 'teacher-access' ? '#0056b3' : '#e0e0e0', color: viewRole === 'lecturer' || viewRole === 'teacher-access' ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Lecturer Mode
          </button>
          {teacher && <TeacherProfile teacher={teacher} onTeacherUpdated={handleTeacherUpdated} onLogout={handleLogout} />}
        </div>
      </div>

      {viewRole === 'teacher-access' ? (
        <TeacherAccess onAuthenticated={handleAuthenticated} onBack={() => setViewRole('student')} />
      ) : viewRole === 'lecturer' ? (
        <LecturerPanel teacher={teacher} />
      ) : (
        <>
          <StudentPanel />
          <Timetable />
        </>
      )}
    </div>
  );
}