const db = require('../config/db');

// Submit live attendance code
exports.submitAttendance = async (req, res) => {
  const { student_code, course_name, session_code } = req.body;

  try {
    const cleanStudentCode = student_code.trim().toUpperCase();
    const cleanCourseName = course_name?.trim().toLowerCase();
    const cleanSessionCode = session_code.trim();

    if (!cleanCourseName) {
      return res.status(400).json({ success: false, message: 'Course name is required.' });
    }

    const [sessions] = await db.query(
      `SELECT sessions.session_id, sessions.class_id, courses.course_name
       FROM AttendanceSessions sessions
       JOIN Classes classes ON sessions.class_id = classes.class_id
       JOIN Courses courses ON classes.course_id = courses.course_id
       WHERE session_code = ? AND is_active = TRUE AND expires_at > NOW()`,
      [cleanSessionCode]
    );

    if (sessions.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired session code.' });
    }

    const activeSession = sessions[0];
    if (activeSession.course_name.trim().toLowerCase() !== cleanCourseName) {
      return res.status(400).json({ success: false, message: 'The course name does not match this attendance session.' });
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

// Fetch weekly schedule
exports.getSchedule = async (req, res) => {
  try {
    const sql = `
      SELECT s.day_of_week, s.start_time, s.end_time, s.is_lab,
             co.course_code, co.course_name, cl.teacher_name, cl.room_number
      FROM Schedule s
      JOIN Classes cl ON s.class_id = cl.class_id
      JOIN Courses co ON cl.course_id = co.course_id
      ORDER BY FIELD(s.day_of_week, 'MON', 'TUES', 'WED', 'THURS', 'FRI'), s.start_time;
    `;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};