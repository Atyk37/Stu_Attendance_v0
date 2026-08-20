import React, { useState, useEffect } from 'react';
import StudentEnrollmentManager from './StudentEnrollmentManager';

export default function LecturerPanel({ teacher }) {
  const [classList, setClassList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [courseForm, setCourseForm] = useState({ course_code: '', course_name: '', is_elective: false, room_number: 'L 202', academic_year: '2025-2026', semester: 'Semester VIII' });
  const [courseFeedback, setCourseFeedback] = useState(null);
  const [deletingClassId, setDeletingClassId] = useState(null);
  const [sessionFeedback, setSessionFeedback] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [searchHistoryCode, setSearchHistoryCode] = useState('');
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  useEffect(() => {
    fetch(`http://localhost:3000/api/lecturer/classes?teacher_id=${teacher.teacher_id}`)
      .then((res) => res.json())
      .then((data) => setClassList(data))
      .catch((err) => console.error(err));
  }, [teacher.teacher_id]);

  const handleCreateCourse = async (event) => {
    event.preventDefault();
    setCourseFeedback(null);
    if (!teacher?.teacher_id) {
      setCourseFeedback({ success: false, message: 'You must be signed in as a teacher to create courses.' });
      return;
    }
    try {
      const response = await fetch('http://localhost:3000/api/lecturer/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...courseForm, teacher_id: teacher.teacher_id })
      });

      const contentType = response.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) data = await response.json();
      else data = { error: await response.text() };

      if (!response.ok) throw new Error(data.error || 'Unable to create course.');

      setCourseFeedback({ success: true, message: 'Course created successfully.' });
      setCourseForm({ course_code: '', course_name: '', is_elective: false, room_number: 'L 202', academic_year: '2025-2026', semester: 'Semester VIII' });
      const classesResponse = await fetch(`http://localhost:3000/api/lecturer/classes?teacher_id=${teacher.teacher_id}`);
      setClassList(await classesResponse.json());
    } catch (error) {
      setCourseFeedback({ success: false, message: error.message });
    }
  };

  const handleStartSession = async () => {
    if (!selectedClassId) return alert('Select a course first.');
    setSessionLoading(true);
    setSessionFeedback(null);
    try {
      const res = await fetch('http://localhost:3000/api/lecturer/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: selectedClassId, teacher_id: teacher.teacher_id, duration_minutes: 10 })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || data.message || 'Unable to open attendance code.');
      setActiveSession(data);
    } catch (error) {
      setSessionFeedback({ success: false, message: error.message });
    } finally {
      setSessionLoading(false);
    }
  };

  const handleDeleteCourse = async (course) => {
    if (!window.confirm(`Delete ${course.course_code} - ${course.course_name}? This also removes its attendance records and sessions.`)) return;
    setDeletingClassId(course.class_id);
    setCourseFeedback(null);
    try {
      const response = await fetch(`http://localhost:3000/api/lecturer/courses/${course.class_id}?teacher_id=${teacher.teacher_id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to delete course.');
      setClassList((currentClasses) => currentClasses.filter((item) => item.class_id !== course.class_id));
      if (selectedClassId === String(course.class_id)) setSelectedClassId('');
      setCourseFeedback({ success: true, message: data.message });
    } catch (error) {
      setCourseFeedback({ success: false, message: error.message });
    } finally {
      setDeletingClassId(null);
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    setSessionLoading(true);
    setSessionFeedback(null);
    try {
      const response = await fetch('http://localhost:3000/api/lecturer/close-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.session_id, teacher_id: teacher.teacher_id })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || data.message || 'Unable to end attendance session.');
      setActiveSession(null);
    } catch (error) {
      setSessionFeedback({ success: false, message: error.message });
    } finally {
      setSessionLoading(false);
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
    <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #ccc' }}>
      <h3>Lecturer Session Controller</h3>
      <div style={{ marginBottom: '25px', padding: '20px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
        <h3>Create Your Course</h3>
        <form onSubmit={handleCreateCourse} style={{ display: 'grid', gap: '12px' }}>
          <input type="text" placeholder="Course code (e.g. CST-4301)" value={courseForm.course_code} onChange={(e) => setCourseForm({ ...courseForm, course_code: e.target.value })} required />
          <input type="text" placeholder="Course name" value={courseForm.course_name} onChange={(e) => setCourseForm({ ...courseForm, course_name: e.target.value })} required />
          <input type="text" placeholder="Room number" value={courseForm.room_number} onChange={(e) => setCourseForm({ ...courseForm, room_number: e.target.value })} required />
          <label><input type="checkbox" checked={courseForm.is_elective} onChange={(e) => setCourseForm({ ...courseForm, is_elective: e.target.checked })} /> Elective course</label>
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#0056b3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Create Course</button>
        </form>
        {courseFeedback && <p style={{ color: courseFeedback.success ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>{courseFeedback.message}</p>}
      </div>
      <div style={{ marginBottom: '25px', padding: '20px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
        <h3>Your Courses</h3>
        {classList.length === 0 ? (
          <p style={{ color: '#666' }}>You have not created any courses yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {classList.map((course) => (
              <div key={course.class_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}>
                <span><strong>{course.course_code}</strong> - {course.course_name} ({course.room_number})</span>
                <button type="button" onClick={() => handleDeleteCourse(course)} disabled={deletingClassId === course.class_id} style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: deletingClassId === course.class_id ? 'wait' : 'pointer', fontWeight: 'bold' }}>
                  {deletingClassId === course.class_id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <select 
          value={selectedClassId} 
          onChange={(e) => {
            setSelectedClassId(e.target.value);
            setActiveSession(null);
            setSessionFeedback(null);
          }}
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
          <button onClick={handleStartSession} disabled={sessionLoading} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: sessionLoading ? 'wait' : 'pointer', fontWeight: 'bold' }}>
            {sessionLoading ? 'Generating Code...' : 'Open Attendance Code'}
          </button>
        ) : (
          <button onClick={handleCloseSession} disabled={sessionLoading} style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: sessionLoading ? 'wait' : 'pointer', fontWeight: 'bold' }}>
            {sessionLoading ? 'Ending Session...' : 'End Session'}
          </button>
        )}
      </div>

      {sessionFeedback && <p style={{ color: '#dc3545', fontWeight: 'bold' }}>{sessionFeedback.message}</p>}

      {activeSession && (
        <div style={{ textAlign: 'center', backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '8px', border: '2px dashed #0056b3' }}>
          <h4 style={{ margin: 0, color: '#0056b3' }}>LIVE ATTENDANCE CODE</h4>
          <h1 style={{ fontSize: '52px', letterSpacing: '10px', margin: '10px 0', color: '#28a745' }}>{activeSession.session_code}</h1>
          <p style={{ margin: 0, color: '#555' }}>Provide this code to class members to mark PRESENT.</p>
        </div>
      )}

      <StudentEnrollmentManager teacher={teacher} selectedClassId={selectedClassId} />

      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
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