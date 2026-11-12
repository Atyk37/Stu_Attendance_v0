import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../api';

const statusMark = { PRESENT: 'P', ABSENT: 'A' };

export default function MonthlyAttendance({ teacher, selectedClassId }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedClassId) return;
    setLoading(true);
    setError('');
    fetch(`${API_BASE_URL}/api/lecturer/classes/${selectedClassId}/monthly-attendance?teacher_id=${teacher.teacher_id}&month=${month}`)
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? await response.json() : { error: `Server returned HTTP ${response.status}. Restart the backend server and try again.` };
        if (!response.ok) throw new Error(data.error || 'Unable to load monthly attendance.');
        return data;
      })
      .then(setSheet)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [month, selectedClassId, teacher.teacher_id]);

  if (!selectedClassId) return null;
  const days = sheet ? Array.from({ length: 22 }, (_, index) => index + 1) : [];
  const attendanceSummary = days.map((day) => {
    if (!sheet?.attendance_dates?.[day - 1]) return null;
    const totalStudents = sheet.students.length;
    const present = sheet.students.filter((student) => student.days[day] === 'PRESENT').length;
    const absent = Math.max(totalStudents - present, 0);
    return { present, absent };
  });

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Monthly Attendance Record</h3>
          <p className="text-sm text-slate-600">Mark: P Present · A Absent</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          Month
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      {loading && <p className="mt-4 text-sm text-slate-600">Loading monthly record...</p>}
      {error && <p className="mt-4 text-sm font-bold text-red-600">{error}</p>}

      {sheet && !loading && (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-295 w-full table-fixed border-collapse text-[12px]">
            <colgroup>
              <col className="w-10.5" />
              <col className="w-31.25" />
              <col className="w-47.5" />
              {days.map((day) => <col key={day} className="w-7.5" />)}
              <col className="w-16.25" />
            </colgroup>
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th rowSpan="2" className="border border-slate-300 p-2">No.</th>
                <th rowSpan="2" className="border border-slate-300 p-2">Student ID</th>
                <th rowSpan="2" className="border border-slate-300 p-2">Student name</th>
                {days.map((day) => (
                  <th key={day} className="border border-slate-300 p-2">{day}</th>
                ))}
                <th rowSpan="2" className="border border-slate-300 p-2">Total</th>
              </tr>
              <tr className="bg-slate-50 text-slate-700">
                {days.map((day) => (
                  <th key={day} className="border border-slate-300 p-2">{sheet.attendance_dates?.[day - 1] || '\u00a0'}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.students.map((student, index) => (
                <tr key={student.student_id} className="border-b border-slate-200 text-center">
                  <td className="border border-slate-200 p-2">{index + 1}</td>
                  <td className="border border-slate-200 p-2 text-left whitespace-nowrap"><strong>{student.student_code}</strong></td>
                  <td className="border border-slate-200 p-2 text-left">{student.name_myanmar}</td>
                  {days.map((day) => {
                    const attendanceValue = student.days[day];
                    return (
                      <td
                        key={day}
                        className={`border border-slate-200 p-2 font-bold ${attendanceValue === 'PRESENT' ? 'text-emerald-600' : attendanceValue === 'ABSENT' ? 'text-red-600' : 'text-amber-600'}`}
                      >
                        {statusMark[attendanceValue] || ''}
                      </td>
                    );
                  })}
                  <td className="border border-slate-200 p-2 font-bold">{student.present_days || '-'}</td>
                </tr>
              ))}

              <tr className="bg-emerald-50 text-center font-bold text-emerald-700">
                <td colSpan="3" className="border border-slate-300 p-2 text-left">Present Students</td>
                {attendanceSummary.map((summary, index) => (
                  <td key={index} className="border border-slate-300 p-2">
                    {summary ? summary.present || '' : ''}
                  </td>
                ))}
                <td className="border border-slate-300 p-2"></td>
              </tr>
              <tr className="bg-red-50 text-center font-bold text-red-700">
                <td colSpan="3" className="border border-slate-300 p-2 text-left">Absent Students</td>
                {attendanceSummary.map((summary, index) => (
                  <td key={index} className="border border-slate-300 p-2">
                    {summary ? summary.absent || '' : ''}
                  </td>
                ))}
                <td className="border border-slate-300 p-2">{sheet.students.reduce((total, student) => total + student.absent_days, 0) || ''}</td>
              </tr>
            </tbody>
          </table>
          {sheet.students.length === 0 && <p className="mt-3 text-sm text-slate-600">No students are enrolled in this course.</p>}
        </div>
      )}
    </section>
  );
}