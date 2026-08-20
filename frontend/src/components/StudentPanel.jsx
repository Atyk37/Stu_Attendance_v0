import React, { useState } from 'react';

export default function StudentPanel() {
  const [inputStudentCode, setInputStudentCode] = useState('');
  const [inputSessionCode, setInputSessionCode] = useState('');
  const [submitFeedback, setSubmitFeedback] = useState(null);

  const handleSubmitAttendance = async (e) => {
    e.preventDefault();
    setSubmitFeedback(null);
    try {
      const res = await fetch('http://localhost:3000/api/student/submit-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_code: inputStudentCode, session_code: inputSessionCode })
      });
      const data = await res.json();
      setSubmitFeedback(data);
    } catch (err) {
      setSubmitFeedback({ success: false, message: 'Server connection error.' });
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3>Submit Class Attendance</h3>
        <form onSubmit={handleSubmitAttendance} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input 
            type="text" 
            placeholder="Student Code (e.g., KPTMYK-001253)" 
            value={inputStudentCode} 
            onChange={(e) => setInputStudentCode(e.target.value)}
            style={{ padding: '10px', fontSize: '15px' }}
            required 
          />
          <input 
            type="text" 
            placeholder="6-Digit Session Code" 
            value={inputSessionCode} 
            onChange={(e) => setInputSessionCode(e.target.value)}
            style={{ padding: '10px', fontSize: '15px' }}
            required 
          />
          <button type="submit" style={{ padding: '12px', backgroundColor: '#0056b3', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            Submit Attendance
          </button>
        </form>

        {submitFeedback && (
          <p style={{ marginTop: '15px', fontWeight: 'bold', color: submitFeedback.success ? '#28a745' : '#dc3545' }}>
            {submitFeedback.message}
          </p>
        )}
      </div>

    </div>
  );
}