import React from 'react';

export default function Timetable() {
  const days = ['MON', 'TUES', 'WED', 'THURS', 'FRI'];
  const timeSlots = [
    { label: '9:00–10:00', startHour: 9, endHour: 10 },
    { label: '10:00–11:00', startHour: 10, endHour: 11 },
    { label: '11:00–12:00', startHour: 11, endHour: 12 },
    { label: 'Lunch (12:00–1:00)', isLunch: true },
    { label: '1:00–2:00', startHour: 13, endHour: 14 },
    { label: '2:00–3:00', startHour: 14, endHour: 15 },
    { label: '3:00–4:00', startHour: 15, endHour: 16 },
  ];

  const staticSchedule = [
    { day: 'MON', course_code: 'CST-4257', room_number: 'L 202', startHour: 9, endHour: 10, is_lab: false },
    { day: 'MON', course_code: 'CST-4257', room_number: 'L 202', startHour: 10, endHour: 11, is_lab: false },
    { day: 'MON', course_code: 'CST-4211', room_number: 'L 202', startHour: 11, endHour: 12, is_lab: false },
    { day: 'MON', course_code: 'CS-4216', room_number: 'L 202', startHour: 13, endHour: 14, is_lab: true },
    { day: 'MON', course_code: 'CST-4242', room_number: 'L 202', startHour: 14, endHour: 15, is_lab: false },
    { day: 'MON', course_code: 'CST-4242', room_number: 'L 202', startHour: 15, endHour: 16, is_lab: false },

    { day: 'TUES', course_code: 'CS-4223', room_number: 'L 202', startHour: 9, endHour: 10, is_lab: true },
    { day: 'TUES', course_code: 'CS-4223', room_number: 'L 202', startHour: 10, endHour: 11, is_lab: true },
    { day: 'TUES', course_code: 'CS-4216', room_number: 'L 202', startHour: 11, endHour: 12, is_lab: false },
    { day: 'TUES', course_code: 'CST-4257', room_number: 'L 202', startHour: 13, endHour: 14, is_lab: false },
    { day: 'TUES', course_code: 'CS-4214', room_number: 'L 202', startHour: 14, endHour: 15, is_lab: false },
    { day: 'TUES', course_code: 'CST-4211', room_number: 'L 202', startHour: 15, endHour: 16, is_lab: true },

    { day: 'WED', course_code: 'CS-4225', room_number: 'L 202', startHour: 9, endHour: 10, is_lab: false },
    { day: 'WED', course_code: 'CS-4223', room_number: 'L 202', startHour: 10, endHour: 11, is_lab: false },
    { day: 'WED', course_code: 'CS-4223', room_number: 'L 202', startHour: 11, endHour: 12, is_lab: false },
    { day: 'WED', course_code: 'CST-4242', room_number: 'L 202', startHour: 13, endHour: 14, is_lab: false },
    { day: 'WED', course_code: 'CS-4225', room_number: 'L 202', startHour: 14, endHour: 15, is_lab: true },
    { day: 'WED', course_code: 'CS-4225', room_number: 'L 202', startHour: 15, endHour: 16, is_lab: true },

    { day: 'THURS', course_code: 'CS-4214', room_number: 'L 202', startHour: 9, endHour: 10, is_lab: false },
    { day: 'THURS', course_code: 'CST-4211', room_number: 'L 202', startHour: 10, endHour: 11, is_lab: false },
    { day: 'THURS', course_code: 'CST-4211', room_number: 'L 202', startHour: 11, endHour: 12, is_lab: false },
    { day: 'THURS', course_code: 'Activity', room_number: 'L 202', startHour: 13, endHour: 14, is_lab: false },
    { day: 'THURS', course_code: 'CS-4216', room_number: 'L 202', startHour: 14, endHour: 15, is_lab: false },
    { day: 'THURS', course_code: 'CS-4216', room_number: 'L 202', startHour: 15, endHour: 16, is_lab: false },

    { day: 'FRI', course_code: 'CST-4257', room_number: 'L 202', startHour: 9, endHour: 10, is_lab: false },
    { day: 'FRI', course_code: 'CS-4214', room_number: 'L 202', startHour: 10, endHour: 11, is_lab: true },
    { day: 'FRI', course_code: 'CS-4214', room_number: 'L 202', startHour: 11, endHour: 12, is_lab: true },
    { day: 'FRI', course_code: 'CS-4225', room_number: 'L 202', startHour: 13, endHour: 14, is_lab: false },
    { day: 'FRI', course_code: 'Activity', room_number: 'L 202', startHour: 14, endHour: 15, is_lab: false },
    { day: 'FRI', course_code: 'Activity', room_number: 'L 202', startHour: 15, endHour: 16, is_lab: false }
  ];

  const getCourseForSlot = (day, slot) => {
    return staticSchedule.find((item) => item.day === day && item.startHour === slot.startHour && item.endHour === slot.endHour);
  };

  return (
    <div className="timetable-page" style={{ marginTop: '25px', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Header Info */}
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 4px 0', color: '#0056b3' }}>
          POLYTECHNIC UNIVERSITY (MYEIK), FACULTY OF COMPUTING
        </h4>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
          B.C.Sc. Time Table (2025–2026 Academic Year)
        </div>
      </div>

      {/* Main Timetable Matrix */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'center',
            fontSize: '13px',
            backgroundColor: '#fff',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            border: '1px solid #aaa',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f0f4f8', borderBottom: '2px solid #aaa' }}>
              <th
                style={{
                  padding: '10px',
                  border: '1px solid #ccc',
                  backgroundColor: '#e6edf5',
                  width: '90px',
                }}
              >
                Day / Time
              </th>
              {timeSlots.map((slot, idx) => (
                <th
                  key={idx}
                  style={{
                    padding: '8px',
                    border: '1px solid #ccc',
                    fontSize: slot.isLunch ? '12px' : '13px',
                    backgroundColor: slot.isLunch ? '#ffeebd' : '#e6edf5',
                  }}
                >
                  {slot.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day, dIdx) => (
              <tr key={dIdx}>
                {/* Day Name */}
                <td
                  style={{
                    padding: '12px 8px',
                    fontWeight: 'bold',
                    border: '1px solid #ccc',
                    backgroundColor: '#f9f9f9',
                  }}
                >
                  {day}
                </td>

                {/* Time Slots */}
                {timeSlots.map((slot, sIdx) => {
                  if (slot.isLunch) {
                    if (dIdx === 0) {
                      return (
                        <td
                          key={sIdx}
                          rowSpan={days.length}
                          style={{
                            border: '1px solid #ccc',
                            backgroundColor: '#fff9e6',
                            color: '#856404',
                            fontWeight: 'bold',
                            writingMode: 'vertical-rl',
                            textTransform: 'uppercase',
                            letterSpacing: '3px',
                            padding: '10px 0',
                          }}
                        >
                          LUNCH BREAK
                        </td>
                      );
                    }
                    return null;
                  }

                  const match = getCourseForSlot(day, slot);

                  return (
                    <td
                      key={sIdx}
                      style={{
                        padding: '8px',
                        border: '1px solid #ccc',
                        verticalAlign: 'middle',
                      }}
                    >
                      {match ? (
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#0056b3' }}>
                            {match.course_code}{' '}
                            {match.is_lab ? <span style={{ color: '#d9534f' }}>(Lab)</span> : ''}
                          </div>
                          {match.room_number && (
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                              {match.room_number}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#ccc' }}>Activity</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}