import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../api';

const statusMark = { PRESENT: 'P', ABSENT: 'A', LATE: 'L', LEAVE: 'LV' };

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
    const present = sheet.students.filter((student) => student.days[day] === 'PRESENT').length;
    const lateOrLeave = sheet.students.filter((student) => ['LATE', 'LEAVE'].includes(student.days[day])).length;
    return { present, absent: Math.max(sheet.students.length - present - lateOrLeave, 0) };
  });

  return (
    <section className="monthly-page" style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0 }}>Monthly Attendance Record</h3>
          <p style={{ marginBottom: 0, color: '#666' }}>Mark: P Present · A Absent · L Late · LV Leave</p>
        </div>
        <label>Month <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
      </div>
      {loading && <p>Loading monthly record...</p>}
      {error && <p style={{ color: '#dc3545', fontWeight: 'bold' }}>{error}</p>}
      {sheet && !loading && (
        <div style={{ overflowX: 'auto', marginTop: '16px' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '1180px', width: '100%', tableLayout: 'fixed', fontSize: '12px' }}>
            <colgroup>
              <col style={{ width: '42px' }} /><col style={{ width: '125px' }} /><col style={{ width: '190px' }} />
              {days.map((day) => <col key={day} style={{ width: '30px' }} />)}
              <col style={{ width: '150px' }} />
            </colgroup>
            <thead>
              <tr style={{ backgroundColor: '#eef2f4', color: '#1d2933' }}>
                <th rowSpan="2" style={{ padding: '8px', border: '1px solid #9aa5ad' }}>No.</th>
                <th rowSpan="2" style={{ padding: '8px', border: '1px solid #9aa5ad' }}>Student ID</th>
                <th rowSpan="2" style={{ padding: '8px', border: '1px solid #9aa5ad' }}>Student name</th>
                {days.map((day) => <th key={day} style={{ padding: '8px 2px', border: '1px solid #9aa5ad' }}>{day}</th>)}
                <th rowSpan="2" style={{ padding: '8px', border: '1px solid #9aa5ad' }}>Remarks</th>
              </tr>
              <tr style={{ backgroundColor: '#f8fafb', color: '#1d2933' }}>
                {days.map((day) => <th key={day} style={{ padding: '7px 2px', border: '1px solid #9aa5ad' }}>{sheet.attendance_dates?.[day - 1] || '\u00a0'}</th>)}
              </tr>
            </thead>
            <tbody>
              {sheet.students.map((student, index) => (
                <tr key={student.student_id} style={{ borderBottom: '1px solid #c8d0d5', textAlign: 'center' }}>
                  <td style={{ padding: '8px 3px', border: '1px solid #c8d0d5' }}>{index + 1}</td>
                  <td style={{ padding: '8px 4px', border: '1px solid #c8d0d5', textAlign: 'left', whiteSpace: 'nowrap' }}><strong>{student.student_code}</strong></td>
                  <td style={{ padding: '8px 6px', border: '1px solid #c8d0d5', textAlign: 'left' }}>{student.name_myanmar}</td>
                  {days.map((day) => {
                    const attendanceValue = student.days[day];
                    return <td key={day} style={{ padding: '8px 2px', border: '1px solid #c8d0d5', color: attendanceValue === 'PRESENT' ? '#198754' : attendanceValue === 'ABSENT' ? '#dc3545' : '#85604', fontWeight: 'bold' }}>{statusMark[attendanceValue] || ''}</td>;
                  })}
                  <td style={{ padding: '8px 5px', border: '1px solid #c8d0d5', textAlign: 'left' }}>{student.teacher_remark || ''}</td>
                </tr>
              ))}
              <tr style={{ backgroundColor: '#eef2f4', textAlign: 'center', fontWeight: 'bold' }}>
                <td colSpan="3" style={{ padding: '8px 4px', border: '1px solid #9aa5ad', textAlign: 'left', color: '#198754' }}>Present Students</td>
                {attendanceSummary.map((summary, index) => (
                  <td key={index} style={{ padding: '6px 2px', border: '1px solid #9aa5ad', whiteSpace: 'normal' }}>
                    {summary ? summary.present : ''}
                  </td>
                ))}
                <td style={{ padding: '8px 5px', border: '1px solid #9aa5ad' }} />
              </tr>
              <tr style={{ backgroundColor: '#fff5f5', textAlign: 'center', fontWeight: 'bold' }}>
                <td colSpan="3" style={{ padding: '8px 4px', border: '1px solid #9aa5ad', textAlign: 'left', color: '#dc3545' }}>Absent Students</td>
                {attendanceSummary.map((summary, index) => (
                  <td key={index} style={{ padding: '6px 2px', border: '1px solid #9aa5ad' }}>
                    {summary ? summary.absent : ''}
                  </td>
                ))}
                <td style={{ padding: '8px 5px', border: '1px solid #9aa5ad' }} />
              </tr>
            </tbody>
          </table>
          {sheet.students.length === 0 && <p>No students are enrolled in this course.</p>}
        </div>
      )}
    </section>
  );
}