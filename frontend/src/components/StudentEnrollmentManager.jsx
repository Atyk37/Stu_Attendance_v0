import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../api';

export default function StudentEnrollmentManager({ teacher, selectedClassId }) {
  const [students, setStudents] = useState([]);
  const [mode, setMode] = useState('enroll');
  const [newStudent, setNewStudent] = useState({ student_code: '', name_myanmar: '', email: '', username: '' });
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);  
  const [showStudents, setShowStudents] = useState(false);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setShowStudents(false);
      return;
    }
    setLoading(true);
    fetch(`${API_BASE_URL}/api/lecturer/classes/${selectedClassId}/students?teacher_id=${teacher.teacher_id}`)
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
      const response = await fetch(`${API_BASE_URL}/api/lecturer/classes/${selectedClassId}/students/${student.student_id}?teacher_id=${teacher.teacher_id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to remove student.');
      setStudents((currentStudents) => currentStudents.filter((item) => item.student_id !== student.student_id));
      setFeedback({ success: true, message: data.message });
    } catch (error) {
      setFeedback({ success: false, message: error.message });
    }
  };

  const handleStudentSubmit = async (event) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const isNewStudent = mode === 'register';
      const endpoint = isNewStudent ? 'register' : '';
      const response = await fetch(`${API_BASE_URL}/api/lecturer/classes/${selectedClassId}/students${endpoint ? `/${endpoint}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNewStudent
          ? { teacher_id: teacher.teacher_id, ...newStudent }
          : { teacher_id: teacher.teacher_id, student_code: newStudent.student_code })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (isNewStudent ? 'Unable to register student.' : 'Unable to enroll student.'));
      setStudents((currentStudents) => [...currentStudents, data.student].sort((a, b) => a.student_code.localeCompare(b.student_code)));
      setNewStudent({ student_code: '', name_myanmar: '', email: '', username: '' });
      setFeedback({ success: true, message: isNewStudent ? `${data.student.student_code} was registered and added.` : `${data.student.student_code} was added to this course.` });
    } catch (error) {
      setFeedback({ success: false, message: error.message });
    }
  };

  if (!selectedClassId) return <p style={{ marginTop: '20px', color: '#666' }}>Select one of your courses to manage students.</p>;

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mt-0 text-xl font-bold text-slate-800">
        {mode === 'enroll' ? 'Add Existing Student' : 'Register New Student'}
      </h3>
      <p className="mt-0 text-sm text-slate-600">
        {mode === 'enroll' ? 'Enter the student code of an existing student account.' : 'Create a student account and add it to this course.'}
      </p>

      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => { setMode('enroll'); setFeedback(null); }}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'enroll' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}
        >
          Existing Student
        </button>
        <button
          type="button"
          onClick={() => { setMode('register'); setFeedback(null); }}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'register' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}
        >
          New Student
        </button>
      </div>

      <form onSubmit={handleStudentSubmit} className="grid gap-3 md:grid-cols-2">
        <input
          type="text"
          value={newStudent.student_code}
          onChange={(event) => setNewStudent({ ...newStudent, student_code: event.target.value })}
          placeholder="Student code"
          aria-label="Student code"
          className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:col-span-2"
          required
        />
        {mode === 'register' && (
          <>
            <input
              type="text"
              value={newStudent.name_myanmar}
              onChange={(event) => setNewStudent({ ...newStudent, name_myanmar: event.target.value })}
              placeholder="Student name"
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
            <input
              type="email"
              value={newStudent.email}
              onChange={(event) => setNewStudent({ ...newStudent, email: event.target.value })}
              placeholder="Student email"
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
            <input
              type="text"
              value={newStudent.username}
              onChange={(event) => setNewStudent({ ...newStudent, username: event.target.value })}
              placeholder="Student username"
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:col-span-2"
              required
            />
          </>
        )}
        <button
          type="submit"
          className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 md:col-span-2"
        >
          {mode === 'enroll' ? 'Add Existing Student to Course' : 'Register and Add Student'}
        </button>
      </form>

      {feedback && (
        <p className={`mt-3 text-sm font-bold ${feedback.success ? 'text-emerald-600' : 'text-red-600'}`}>
          {feedback.message}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowStudents(true)}
        className="mt-4 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
      >
        View Enrolled Students ({students.length})
      </button>

      {showStudents && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/45 p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="enrolled-students-title"
          onClick={(event) => event.target === event.currentTarget && setShowStudents(false)}
        >
          <div className="max-h-[80vh] w-full max-w-[680px] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h3 id="enrolled-students-title" className="m-0 text-xl font-bold text-slate-800">
                Enrolled Students ({students.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowStudents(false)}
                aria-label="Close enrolled students"
                className="h-9 w-9 rounded-full border border-slate-300 bg-slate-100 text-xl text-slate-700 transition hover:bg-slate-200"
              >
                ×
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-600">Loading students...</p>
            ) : students.length === 0 ? (
              <p className="text-sm text-slate-600">No students enrolled in this course.</p>
            ) : (
              <div className="grid gap-2">
                {students.map((student) => (
                  <div key={student.student_id} className="flex items-center justify-between gap-3 rounded-xl border-b border-slate-200 px-2 py-3">
                    <span className="text-sm text-slate-700">
                      <strong>{student.student_code}</strong> - {student.name_myanmar}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStudent(student)}
                      className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
