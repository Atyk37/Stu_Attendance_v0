import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../api';

export default function Timetable() {
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    // Explicitly target express port to avoid Vite dev server 404
    fetch(`${API_BASE_URL}/api/student/schedule`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setWeeklySchedule(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load schedule:', err);
        setWeeklySchedule([]);
        setLoading(false);
      });
  }, []);

  const getHour = (timeStr) => {
    if (!timeStr) return -1;
    // Handles '09:00:00', '13:00', or '1:00:00'
    const parts = timeStr.toString().trim().split(':');
    const hour = parseInt(parts[0], 10);
    return isNaN(hour) ? -1 : hour;
  };

  const getCourseForSlot = (day, slot) => {
    if (!weeklySchedule || weeklySchedule.length === 0) return null;

    return weeklySchedule.find((item) => {
      if (!item.day_of_week) return false;

      // Normalize day matching (e.g., "MONDAY" -> "MON", "MON" -> "MON")
      const itemDay = item.day_of_week.trim().toUpperCase();
      const targetDay = day.trim().toUpperCase();
      
      const isDayMatch = itemDay.startsWith(targetDay.slice(0, 3));
      if (!isDayMatch) return false;

      const itemStartHour = getHour(item.start_time);
      const itemEndHour = getHour(item.end_time);

      if (itemStartHour === -1 || itemEndHour === -1) return false;

      // Check if slot falls within course timeframe
      return slot.startHour >= itemStartHour && slot.endHour <= itemEndHour;
    });
  };

  if (loading) {
    return (
      <div style={{ marginTop: '30px', textAlign: 'center', color: '#555' }}>
        အချိန်စာရင်း ရယူနေပါသည်...
      </div>
    );
  }

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