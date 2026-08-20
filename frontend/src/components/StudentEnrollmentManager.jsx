import React, { useEffect, useState } from 'react';

export default function StudentEnrollmentManager({ teacher, selectedClassId }) {
  const [students, setStudents] = useState([]);
  const [newStudent, setNewStudent] = useState({ student_code: '', name_myanmar: '', email: '', username: '' });
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      return;
    }
    setLoading(true);
    fetch(`http://localhost:3000/api/lecturer/classes/${selectedClassId}/students?teacher_id=${teacher.teacher_id}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setStudents(data);
      })
      .catch((error) => setFeedback({ success: false, message: error.message }))
      .finally(() => setLoading(false));
  }, [selectedClassId, teacher.teacher_id]);

  const handleRemoveStudent = async (student) => {
    if (!window.confirm(`Remove ${student.student_code} from this course?`)) return;
    try {
      const response = await fetch(`http://localhost:3000/api/lecturer/classes/${selectedClassId}/students/${student.student_id}?teacher_id=${teacher.teacher_id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to remove student.');
      setStudents((currentStudents) => currentStudents.filter((item) => item.student_id !== student.student_id));
      setFeedback({ success: true, message: data.message });
    } catch (error) {
      setFeedback({ success: false, message: error.message });
    }
  };

  const handleRegisterStudent = async (event) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const response = await fetch(`http://localhost:3000/api/lecturer/classes/${selectedClassId}/students/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: teacher.teacher_id, ...newStudent })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to register student.');
      setStudents((currentStudents) => [...currentStudents, data.student].sort((a, b) => a.student_code.localeCompare(b.student_code)));
      setNewStudent({ student_code: '', name_myanmar: '', email: '', username: '' });
      setFeedback({ success: true, message: `${data.student.student_code} was registered and added.` });
    } catch (error) {
      setFeedback({ success: false, message: error.message });
    }
  };

  if (!selectedClassId) return <p style={{ marginTop: '20px', color: '#666' }}>Select one of your courses to manage students.</p>;

  return (
    <section style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '6px' }}>
      <h3 style={{ marginTop: 0 }}>Add New Student</h3>
      <p style={{ marginTop: 0, color: '#666' }}>Create a student account and add it to this course.</p>
      <form onSubmit={handleRegisterStudent} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
        <input type="text" value={newStudent.student_code} onChange={(event) => setNewStudent({ ...newStudent, student_code: event.target.value })} placeholder="Student code" aria-label="Student code" required />
        <input type="text" value={newStudent.name_myanmar} onChange={(event) => setNewStudent({ ...newStudent, name_myanmar: event.target.value })} placeholder="Student name" required />
        <input type="email" value={newStudent.email} onChange={(event) => setNewStudent({ ...newStudent, email: event.target.value })} placeholder="Student email" required />
        <input type="text" value={newStudent.username} onChange={(event) => setNewStudent({ ...newStudent, username: event.target.value })} placeholder="Student username" required />
        <button type="submit" style={{ gridColumn: '1 / -1', padding: '11px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Add Student to Course</button>
      </form>
      {feedback && <p style={{ color: feedback.success ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>{feedback.message}</p>}
      {loading ? <p>Loading students...</p> : students.length === 0 ? <p style={{ color: '#666' }}>No students enrolled in this course.</p> : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {students.map((student) => (
            <div key={student.student_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '10px', borderBottom: '1px solid #eee' }}>
              <span><strong>{student.student_code}</strong> - {student.name_myanmar}</span>
              <button type="button" onClick={() => handleRemoveStudent(student)} style={{ padding: '6px 10px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
