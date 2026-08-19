import React, { useState } from 'react';

export default function StudentPanel() {
  const [inputStudentCode, setInputStudentCode] = useState('');
  const [inputSessionCode, setInputSessionCode] = useState('');
  const [submitFeedback, setSubmitFeedback] = useState(null);
  const [searchHistoryCode, setSearchHistoryCode] = useState('');
  const [attendanceHistory, setAttendanceHistory] = useState([]);

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

  const handleQueryHistory = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:3000/api/student/attendance/${searchHistoryCode}`);
      const data = await res.json();
      if (res.ok) setAttendanceHistory(data);
      else alert(data.error);
    } catch (err) {
      console.error(err);
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

      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #ddd' }}>
        <h3>Search Attendance Records</h3>
        <form onSubmit={handleQueryHistory} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input 
            type="text" 
            placeholder="Enter Student Code (e.g. KPTMYK-001253)" 
            value={searchHistoryCode} 
            onChange={(e) => setSearchHistoryCode(e.target.value)}
            style={{ padding: '10px', flex: 1 }}
            required 
          />
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Search
          </button>
        </form>

        {attendanceHistory.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#343a40', color: '#fff', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Date</th>
                <th style={{ padding: '10px' }}>Course</th>
                <th style={{ padding: '10px' }}>Teacher</th>
                <th style={{ padding: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceHistory.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{new Date(row.attendance_date).toLocaleDateString()}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.course_code}</td>
                  <td style={{ padding: '10px' }}>{row.teacher_name}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: row.status === 'PRESENT' ? '#28a745' : '#dc3545' }}>
                    {row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}