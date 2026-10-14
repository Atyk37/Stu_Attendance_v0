import React, { useState } from 'react';
import { API_BASE_URL } from '../api';

export default function StudentPanel() {
  const [inputStudentCode, setInputStudentCode] = useState('');
  const [inputCourseCode, setInputCourseCode] = useState('');
  const [inputSessionCode, setInputSessionCode] = useState('');
  const [submitFeedback, setSubmitFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitAttendance = async (e) => {
    e.preventDefault();
    setSubmitFeedback(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/student/submit-attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_code: inputStudentCode, course_code: inputCourseCode, session_code: inputSessionCode })
      });
      const data = await res.json();
      setSubmitFeedback(data);
    } catch (err) {
      setSubmitFeedback({ success: false, message: 'Server connection error.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="mb-4 text-2xl font-bold text-slate-800">Submit Class Attendance</h3>
        <form onSubmit={handleSubmitAttendance} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Student Code (e.g., KPTMYK-001253)"
            value={inputStudentCode}
            onChange={(e) => setInputStudentCode(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
          <input
            type="text"
            placeholder="Course code (e.g., CST-4301)"
            value={inputCourseCode}
            onChange={(e) => setInputCourseCode(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
          <input
            type="text"
            placeholder="6-Digit Session Code"
            value={inputSessionCode}
            onChange={(e) => setInputSessionCode(e.target.value)}
            inputMode="numeric"
            maxLength="6"
            pattern="[0-9]{6}"
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-blue-700 px-4 py-3 text-base font-bold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:bg-blue-500"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Attendance'}
          </button>
        </form>

        {submitFeedback && (
          <p className={`mt-4 text-sm font-bold ${submitFeedback.success ? 'text-emerald-600' : 'text-red-600'}`}>
            {submitFeedback.message}
          </p>
        )}
      </div>
    </div>
  );
}