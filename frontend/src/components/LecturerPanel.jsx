import React, { useState, useEffect } from 'react';
import StudentEnrollmentManager from './StudentEnrollmentManager';
import MonthlyAttendance from './MonthlyAttendance';
import { API_BASE_URL } from '../api';

const semesterNames = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
const studyYears = ['First Year', 'Second Year', 'Third Year', 'Fourth Year', 'Final Year'];

const getYearNumber = (year) => {
  const yearIndex = studyYears.indexOf(year);
  if (yearIndex !== -1) return yearIndex + 1;

  const legacyYear = /^Year ([1-5])$/.exec(year || '');
  return legacyYear ? Number(legacyYear[1]) : 1;
};

const formatStudyYear = (year) => {
  const legacyYear = /^Year ([1-5])$/.exec(year || '');
  return legacyYear ? studyYears[Number(legacyYear[1]) - 1] : year;
};

const getSemestersForYear = (year) => {
  const firstSemester = (getYearNumber(year) - 1) * 2;
  const semesterCount = getYearNumber(year) === 5 ? 1 : 2;
  return semesterNames.slice(firstSemester, firstSemester + semesterCount).map((roman, index) => ({
    value: String(firstSemester + index + 1),
    label: `Semester ${roman}`
  }));
};

export default function LecturerPanel({ teacher }) {
  const [classList, setClassList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [activeSession, setActiveSession] = useState(() => {
    try {
      const savedSession = JSON.parse(localStorage.getItem('attendance_active_session'));
      return savedSession?.teacher_id === teacher.teacher_id ? savedSession : null;
    } catch {
      return null;
    }
  });
  const [courseForm, setCourseForm] = useState({ course_code: '', course_name: '', is_elective: false, academic_year: 'First Year', semester: 'Semester I' });
  const [courseFeedback, setCourseFeedback] = useState(null);
  const [deletingClassId, setDeletingClassId] = useState(null);
  const [sessionFeedback, setSessionFeedback] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [searchHistoryCode, setSearchHistoryCode] = useState('');
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/lecturer/classes?teacher_id=${teacher.teacher_id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load your courses.');
        if (!Array.isArray(data)) throw new Error('The server returned an invalid course list.');

        setClassList(data);
        const savedClassId = localStorage.getItem('attendance_selected_class') || '';
        const savedClassIsOwned = data.some((course) => String(course.class_id) === savedClassId);
        if (savedClassIsOwned) {
          setSelectedClassId(savedClassId);
        } else {
          localStorage.removeItem('attendance_selected_class');
          setSelectedClassId('');
        }
      } catch (error) {
        console.error(error);
        setCourseFeedback({ success: false, message: error.message });
      }
    };

    loadClasses();
  }, [teacher.teacher_id]);

  const handleCreateCourse = async (event) => {
    event.preventDefault();
    setCourseFeedback(null);
    if (!teacher?.teacher_id) {
      setCourseFeedback({ success: false, message: 'You must be signed in as a teacher to create courses.' });
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/lecturer/courses`, {
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
      setCourseForm({ course_code: '', course_name: '', is_elective: false, academic_year: 'First Year', semester: 'Semester I' });
      const classesResponse = await fetch(`${API_BASE_URL}/api/lecturer/classes?teacher_id=${teacher.teacher_id}`);
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
      const res = await fetch(`${API_BASE_URL}/api/lecturer/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: selectedClassId, teacher_id: teacher.teacher_id, duration_minutes: 10 })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || data.message || 'Unable to open attendance code.');
      const session = { ...data, class_id: selectedClassId, teacher_id: teacher.teacher_id };
      setActiveSession(session);
      localStorage.setItem('attendance_active_session', JSON.stringify(session));
      localStorage.setItem('attendance_selected_class', selectedClassId);
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
      const response = await fetch(`${API_BASE_URL}/api/lecturer/courses/${course.class_id}?teacher_id=${teacher.teacher_id}`, { method: 'DELETE' });
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
      const response = await fetch(`${API_BASE_URL}/api/lecturer/close-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.session_id, teacher_id: teacher.teacher_id })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || data.message || 'Unable to end attendance session.');
      setActiveSession(null);
      localStorage.removeItem('attendance_active_session');
    } catch (error) {
      setSessionFeedback({ success: false, message: error.message });
    } finally {
      setSessionLoading(false);
    }
  };

  const handleQueryHistory = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/student/attendance/${searchHistoryCode}`);
      const data = await res.json();
      if (res.ok) setAttendanceHistory(data);
      else alert(data.error);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <h3 className="mb-5 text-2xl font-bold text-slate-800">Lecturer Session Controller</h3>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-xl font-bold text-slate-800">Create Your Course</h3>
          <form onSubmit={handleCreateCourse} className="grid gap-3">
            <input
              type="text"
              placeholder="Course code (e.g. CST-4301)"
              value={courseForm.course_code}
              onChange={(e) => setCourseForm({ ...courseForm, course_code: e.target.value })}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
            <input
              type="text"
              placeholder="Course name"
              value={courseForm.course_name}
              onChange={(e) => setCourseForm({ ...courseForm, course_name: e.target.value })}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Study year
              <select
                value={courseForm.academic_year}
                onChange={(e) => setCourseForm({
                  ...courseForm,
                  academic_year: e.target.value,
                  semester: getSemestersForYear(e.target.value)[0].label
                })}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              >
                {studyYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Semester
              <select
                value={courseForm.semester}
                onChange={(e) => setCourseForm({ ...courseForm, semester: e.target.value })}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              >
                {getSemestersForYear(courseForm.academic_year).map((semester) => (
                  <option key={semester.value} value={semester.label}>{semester.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={courseForm.is_elective}
                onChange={(e) => setCourseForm({ ...courseForm, is_elective: e.target.checked })}
                className="h-4 w-4 accent-blue-600"
              />
              Elective course
            </label>
            <button
              type="submit"
              className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800"
            >
              Create Course
            </button>
          </form>
          {courseFeedback && (
            <p className={`mt-3 text-sm font-bold ${courseFeedback.success ? 'text-emerald-600' : 'text-red-600'}`}>
              {courseFeedback.message}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-xl font-bold text-slate-800">Your Courses</h3>
          {classList.length === 0 ? (
            <p className="text-sm text-slate-600">You have not created any courses yet.</p>
          ) : (
            <div className="grid gap-3">
              {classList.map((course) => (
                <div key={course.class_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-sm text-slate-700">
                    <strong>{course.course_code}</strong> - {course.course_name} ({formatStudyYear(course.academic_year)}, {course.semester})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCourse(course)}
                    disabled={deletingClassId === course.class_id}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:bg-red-400"
                  >
                    {deletingClassId === course.class_id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row">
        <select
          value={selectedClassId}
          onChange={(e) => {
            setSelectedClassId(e.target.value);
            localStorage.setItem('attendance_selected_class', e.target.value);
            setSessionFeedback(null);
          }}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">-- Select Course --</option>
          {classList.map((c) => (
            <option key={c.class_id} value={c.class_id}>
              {c.course_code} - {c.course_name} ({c.teacher_name})
            </option>
          ))}
        </select>

        {!activeSession ? (
          <button
            onClick={handleStartSession}
            disabled={sessionLoading}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:bg-emerald-400"
          >
            {sessionLoading ? 'Generating Code...' : 'Open Attendance Code'}
          </button>
        ) : (
          <button
            onClick={handleCloseSession}
            disabled={sessionLoading}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:bg-red-400"
          >
            {sessionLoading ? 'Ending Session...' : 'End Session'}
          </button>
        )}
      </div>

      {sessionFeedback && <p className="mt-3 text-sm font-bold text-red-600">{sessionFeedback.message}</p>}

      {activeSession && (
        <div className="mt-5 rounded-2xl border-2 border-dashed border-blue-500 bg-blue-50 p-5 text-center">
          <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">LIVE ATTENDANCE CODE</h4>
          <h1 className="my-3 text-5xl font-black tracking-[0.5rem] text-emerald-600">{activeSession.session_code}</h1>
          <p className="text-sm text-slate-600">Provide this code to class members to mark PRESENT.</p>
        </div>
      )}

      <StudentEnrollmentManager teacher={teacher} selectedClassId={selectedClassId} />
      <MonthlyAttendance teacher={teacher} selectedClassId={selectedClassId} />
    </div>
  );
}