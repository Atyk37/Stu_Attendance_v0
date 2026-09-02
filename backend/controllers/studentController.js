const db = require('../config/db');

// Submit live attendance code
exports.submitAttendance = async (req, res) => {
  const { student_code, course_code, session_code } = req.body;

  try {
    const cleanStudentCode = student_code.trim().toUpperCase();
    const cleanCourseCode = course_code?.trim().toUpperCase();
    const cleanSessionCode = session_code?.trim();

    if (!cleanCourseCode) {
      return res.status(400).json({ success: false, message: 'Course code is required.' });
    }
    if (!/^\d{6}$/.test(cleanSessionCode || '')) {
      return res.status(400).json({ success: false, message: 'A valid 6-digit attendance code is required.' });
    }

    const [sessions] = await db.query(
      `SELECT sessions.session_id, sessions.class_id, courses.course_code
       FROM AttendanceSessions sessions
       JOIN Classes classes ON sessions.class_id = classes.class_id
       JOIN Courses courses ON classes.course_id = courses.course_id
       WHERE sessions.session_code = ? AND sessions.is_active = TRUE AND sessions.expires_at > NOW()`,
      [cleanSessionCode]
    );

    if (sessions.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired session code.' });
    }

    const activeSession = sessions[0];
    if (activeSession.course_code.trim().toUpperCase() !== cleanCourseCode) {
      return res.status(400).json({ success: false, message: 'The course code does not match this attendance session.' });
    }

    const [enrollments] = await db.query(
      `SELECT e.enrollment_id
       FROM Enrollments e
       JOIN Students s ON e.student_id = s.student_id
       WHERE s.student_code = ? AND e.class_id = ?`,
      [cleanStudentCode, activeSession.class_id]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not enrolled in this course.' });
    }

    const enrollmentId = enrollments[0].enrollment_id;
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('SELECT enrollment_id FROM Enrollments WHERE enrollment_id = ? FOR UPDATE', [enrollmentId]);

      const [existingAttendance] = await connection.query(
        'SELECT attendance_id FROM Attendance WHERE enrollment_id = ? AND attendance_date = CURDATE() LIMIT 1',
        [enrollmentId]
      );

      if (existingAttendance.length > 0) {
        await connection.rollback();
        return res.status(409).json({ success: false, message: 'Attendance has already been recorded for today.' });
      }

      await connection.query(
        `INSERT INTO Attendance (enrollment_id, attendance_date, status)
         VALUES (?, CURDATE(), 'PRESENT')`,
        [enrollmentId]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.json({ success: true, message: 'Attendance recorded: PRESENT' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Fetch student attendance logs
exports.getAttendanceHistory = async (req, res) => {
  const { studentCode } = req.params;

  try {
    const sql = `
      SELECT 
        st.student_code, st.name_myanmar,
        co.course_code, co.course_name,
        cl.teacher_name, cl.room_number,
        COALESCE(a.attendance_date, CURDATE()) AS attendance_date, 
        COALESCE(a.status, 'ABSENT') AS status
      FROM Students st
      INNER JOIN Enrollments e ON st.student_id = e.student_id
      INNER JOIN Classes cl ON e.class_id = cl.class_id
      INNER JOIN Courses co ON cl.course_id = co.course_id
      LEFT JOIN Attendance a ON e.enrollment_id = a.enrollment_id
      WHERE st.student_code = ?
      ORDER BY a.attendance_date DESC;
    `;
    const [rows] = await db.query(sql, [studentCode.toUpperCase()]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student code not found.' });
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Fetch weekly schedule (static UI timetable)
exports.getSchedule = async (req, res) => {
  try {
    const staticSchedule = [
      { day_of_week: 'MON', start_time: '09:00:00', end_time: '10:00:00', is_lab: false, course_code: 'CST-4257', room_number: 'L 202' },
      { day_of_week: 'MON', start_time: '10:00:00', end_time: '11:00:00', is_lab: false, course_code: 'CST-4257', room_number: 'L 202' },
      { day_of_week: 'MON', start_time: '11:00:00', end_time: '12:00:00', is_lab: false, course_code: 'CST-4211', room_number: 'L 202' },
      { day_of_week: 'MON', start_time: '13:00:00', end_time: '14:00:00', is_lab: true, course_code: 'CS-4216', room_number: 'L 202' },
      { day_of_week: 'MON', start_time: '14:00:00', end_time: '15:00:00', is_lab: false, course_code: 'CST-4242', room_number: 'L 202' },
      { day_of_week: 'MON', start_time: '15:00:00', end_time: '16:00:00', is_lab: false, course_code: 'CST-4242', room_number: 'L 202' },

      { day_of_week: 'TUES', start_time: '09:00:00', end_time: '10:00:00', is_lab: true, course_code: 'CS-4223', room_number: 'L 202' },
      { day_of_week: 'TUES', start_time: '10:00:00', end_time: '11:00:00', is_lab: true, course_code: 'CS-4223', room_number: 'L 202' },
      { day_of_week: 'TUES', start_time: '11:00:00', end_time: '12:00:00', is_lab: false, course_code: 'CS-4216', room_number: 'L 202' },
      { day_of_week: 'TUES', start_time: '13:00:00', end_time: '14:00:00', is_lab: false, course_code: 'CST-4257', room_number: 'L 202' },
      { day_of_week: 'TUES', start_time: '14:00:00', end_time: '15:00:00', is_lab: false, course_code: 'CS-4214', room_number: 'L 202' },
      { day_of_week: 'TUES', start_time: '15:00:00', end_time: '16:00:00', is_lab: true, course_code: 'CST-4211', room_number: 'L 202' },

      { day_of_week: 'WED', start_time: '09:00:00', end_time: '10:00:00', is_lab: false, course_code: 'CS-4225', room_number: 'L 202' },
      { day_of_week: 'WED', start_time: '10:00:00', end_time: '11:00:00', is_lab: false, course_code: 'CS-4223', room_number: 'L 202' },
      { day_of_week: 'WED', start_time: '11:00:00', end_time: '12:00:00', is_lab: false, course_code: 'CS-4223', room_number: 'L 202' },
      { day_of_week: 'WED', start_time: '13:00:00', end_time: '14:00:00', is_lab: false, course_code: 'CST-4242', room_number: 'L 202' },
      { day_of_week: 'WED', start_time: '14:00:00', end_time: '15:00:00', is_lab: true, course_code: 'CS-4225', room_number: 'L 202' },
      { day_of_week: 'WED', start_time: '15:00:00', end_time: '16:00:00', is_lab: true, course_code: 'CS-4225', room_number: 'L 202' },

      { day_of_week: 'THURS', start_time: '09:00:00', end_time: '10:00:00', is_lab: false, course_code: 'CS-4214', room_number: 'L 202' },
      { day_of_week: 'THURS', start_time: '10:00:00', end_time: '11:00:00', is_lab: false, course_code: 'CST-4211', room_number: 'L 202' },
      { day_of_week: 'THURS', start_time: '11:00:00', end_time: '12:00:00', is_lab: false, course_code: 'CST-4211', room_number: 'L 202' },
      { day_of_week: 'THURS', start_time: '13:00:00', end_time: '14:00:00', is_lab: false, course_code: 'CS-4216', room_number: 'L 202' },
      { day_of_week: 'THURS', start_time: '14:00:00', end_time: '15:00:00', is_lab: false, course_code: 'CS-4216', room_number: 'L 202' },
      { day_of_week: 'THURS', start_time: '15:00:00', end_time: '16:00:00', is_lab: false, course_code: 'CS-4216', room_number: 'L 202' },

      { day_of_week: 'FRI', start_time: '09:00:00', end_time: '10:00:00', is_lab: false, course_code: 'CST-4257', room_number: 'L 202' },
      { day_of_week: 'FRI', start_time: '10:00:00', end_time: '11:00:00', is_lab: true, course_code: 'CS-4214', room_number: 'L 202' },
      { day_of_week: 'FRI', start_time: '11:00:00', end_time: '12:00:00', is_lab: true, course_code: 'CS-4214', room_number: 'L 202' },
      { day_of_week: 'FRI', start_time: '13:00:00', end_time: '14:00:00', is_lab: false, course_code: 'CS-4225', room_number: 'L 202' },
      { day_of_week: 'FRI', start_time: '14:00:00', end_time: '15:00:00', is_lab: false, course_code: 'CS-4225', room_number: 'L 202' },
      { day_of_week: 'FRI', start_time: '15:00:00', end_time: '16:00:00', is_lab: false, course_code: 'CS-4225', room_number: 'L 202' }
    ];

    res.json(staticSchedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};