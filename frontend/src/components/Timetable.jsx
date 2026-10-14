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
    <div className="mt-6 font-sans">
      <div className="mb-4 text-center">
        <h4 className="mb-1 text-base font-bold uppercase tracking-wide text-blue-700">
          POLYTECHNIC UNIVERSITY (MYEIK), FACULTY OF COMPUTING
        </h4>
        <div className="text-sm font-bold text-slate-700">
          B.C.Sc. Time Table (2025–2026 Academic Year)
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-center text-[13px]">
          <thead>
            <tr className="border-b-2 border-slate-300 bg-slate-100">
              <th className="w-[90px] border border-slate-300 bg-slate-200 p-2.5 font-semibold text-slate-700">
                Day / Time
              </th>
              {timeSlots.map((slot, idx) => (
                <th
                  key={idx}
                  className={`border border-slate-300 p-2 text-[13px] ${slot.isLunch ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'}`}
                >
                  {slot.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day, dIdx) => (
              <tr key={dIdx}>
                <td className="border border-slate-300 bg-slate-50 p-3 font-bold text-slate-700">
                  {day}
                </td>

                {timeSlots.map((slot, sIdx) => {
                  if (slot.isLunch) {
                    if (dIdx === 0) {
                      return (
                        <td
                          key={sIdx}
                          rowSpan={days.length}
                          className="border border-slate-300 bg-amber-50 p-2 font-bold uppercase tracking-[0.2em] text-amber-700 [writing-mode:vertical-rl]"
                        >
                          LUNCH BREAK
                        </td>
                      );
                    }
                    return null;
                  }

                  const match = getCourseForSlot(day, slot);

                  return (
                    <td key={sIdx} className="border border-slate-300 p-2 align-middle">
                      {match ? (
                        <div>
                          <div className="font-bold text-blue-700">
                            {match.course_code}{' '}
                            {match.is_lab ? <span className="text-red-600">(Lab)</span> : ''}
                          </div>
                          {match.room_number && (
                            <div className="mt-1 text-[11px] text-slate-600">{match.room_number}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">Activity</span>
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