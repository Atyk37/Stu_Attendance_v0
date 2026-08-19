import React, { useState } from 'react';
import LecturerPanel from './components/LecturerPanel';
import StudentPanel from './components/StudentPanel';
import Timetable from './components/Timetable';

export default function App() {
  const [viewRole, setViewRole] = useState('student');

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0056b3', paddingBottom: '12px' }}>
        <h2 style={{ margin: 0, color: '#0056b3' }}>Polytechnic University (Myeik) — Attendance Portal</h2>
        <div>
          <button 
            onClick={() => setViewRole('student')} 
            style={{ padding: '8px 16px', marginRight: '8px', backgroundColor: viewRole === 'student' ? '#0056b3' : '#e0e0e0', color: viewRole === 'student' ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Student Panel
          </button>
          <button 
            onClick={() => setViewRole('lecturer')} 
            style={{ padding: '8px 16px', backgroundColor: viewRole === 'lecturer' ? '#0056b3' : '#e0e0e0', color: viewRole === 'lecturer' ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Lecturer Mode
          </button>
        </div>
      </div>

      {viewRole === 'lecturer' ? (
        <LecturerPanel />
      ) : (
        <>
          <StudentPanel />
          <Timetable />
        </>
      )}
    </div>
  );
}