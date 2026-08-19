import React, { useState, useEffect } from 'react';

export default function LecturerPanel() {
  const [classList, setClassList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3000/api/lecturer/classes')
      .then((res) => res.json())
      .then((data) => setClassList(data))
      .catch((err) => console.error(err));
  }, []);

  const handleStartSession = async () => {
    if (!selectedClassId) return alert('Select a course first.');
    try {
      const res = await fetch('http://localhost:3000/api/lecturer/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: selectedClassId, duration_minutes: 10 })
      });
      const data = await res.json();
      if (data.success) setActiveSession(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    try {
      await fetch('http://localhost:3000/api/lecturer/close-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.session_id })
      });
      setActiveSession(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #ccc' }}>
      <h3>Lecturer Session Controller</h3>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <select 
          value={selectedClassId} 
          onChange={(e) => setSelectedClassId(e.target.value)}
          style={{ padding: '10px', flex: 1, fontSize: '15px' }}
        >
          <option value="">-- Select Course --</option>
          {classList.map((c) => (
            <option key={c.class_id} value={c.class_id}>
              {c.course_code} - {c.course_name} ({c.teacher_name})
            </option>
          ))}
        </select>
        
        {!activeSession ? (
          <button onClick={handleStartSession} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Open Attendance Code
          </button>
        ) : (
          <button onClick={handleCloseSession} style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            End Session
          </button>
        )}
      </div>

      {activeSession && (
        <div style={{ textAlign: 'center', backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '8px', border: '2px dashed #0056b3' }}>
          <h4 style={{ margin: 0, color: '#0056b3' }}>LIVE ATTENDANCE CODE</h4>
          <h1 style={{ fontSize: '52px', letterSpacing: '10px', margin: '10px 0', color: '#28a745' }}>{activeSession.session_code}</h1>
          <p style={{ margin: 0, color: '#555' }}>Provide this code to class members to mark PRESENT.</p>
        </div>
      )}
    </div>
  );
}