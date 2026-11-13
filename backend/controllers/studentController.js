const db = require('../config/db');
const { hashPassword, verifyPassword } = require('../utils/password');
const { createHash, timingSafeEqual } = require('crypto');

exports.signup = async (req, res) => {
  const { student_code: studentCode, email, activation_code: activationCode, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedCode = typeof studentCode === 'string'
    ? studentCode.replace(/\s+/g, '').toUpperCase()
    : '';
  const normalizedActivationCode = typeof activationCode === 'string'
    ? activationCode.trim().toLowerCase()
    : '';

  if (!normalizedCode || !normalizedEmail || !normalizedActivationCode
      || typeof password !== 'string' || !password) {
    return res.status(400).json({
      success: false,
      message: 'Student code, email, activation code, and password are required.'
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }
  if (!/^[a-f0-9]{32}$/.test(normalizedActivationCode)) {
    return res.status(400).json({
      success: false,
      message: 'Student details or activation code are invalid or expired. Ask your admin for a new code.'
    });
  }

  const activationHash = createHash('sha256').update(normalizedActivationCode).digest();
  let connection;
  try {
    const hashedPassword = await hashPassword(password);
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT students.student_id, students.student_code, students.name_myanmar,
              accounts.name, accounts.email, accounts.activation_code_hash
       FROM Students students
       JOIN StudentAccounts accounts ON accounts.student_id = students.student_id
       WHERE students.student_code = ? AND students.email = ?
         AND accounts.email = ? AND accounts.password IS NULL
         AND accounts.activation_expires_at > NOW()
       FOR UPDATE`,
      [normalizedCode, normalizedEmail, normalizedEmail]
    );
    const account = rows[0];
    if (!account || !account.activation_code_hash) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Student details or activation code are invalid or expired. Ask your admin for a new code.'
      });
    }

    const storedHash = Buffer.from(account.activation_code_hash, 'hex');
    if (storedHash.length !== activationHash.length || !timingSafeEqual(storedHash, activationHash)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Student details or activation code are invalid or expired. Ask your admin for a new code.'
      });
    }

    await connection.query(
      `UPDATE StudentAccounts
       SET password = ?, activated_at = NOW(),
           activation_code_hash = NULL, activation_expires_at = NULL
       WHERE student_id = ? AND password IS NULL`,
      [hashedPassword, account.student_id]
    );
    await connection.commit();
    res.status(201).json({
      success: true,
      message: 'Account activated. Sign in with your email and password.',
      student: {
        student_id: account.student_id,
        student_code: account.student_code,
        name: account.name || account.name_myanmar,
        email: account.email
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Student account activation failed:', error);
    res.status(500).json({ success: false, message: 'Unable to activate the account right now.' });
  } finally {
    if (connection) connection.release();
  }
};

exports.login = async (req, res) => {
  const { email, student_code, password } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedCode = typeof student_code === 'string' ? student_code.replace(/\s+/g, '').toUpperCase() : '';
  if (!normalizedEmail || !normalizedCode || typeof password !== 'string' || !password) {
    return res.status(400).json({ success: false, message: 'Email, student code, and password are required.' });
  }

  try {
    const [rows] = await db.query(
      `SELECT students.student_id, students.student_code, accounts.name, accounts.email, accounts.password
       FROM StudentAccounts accounts
       JOIN Students students ON students.student_id = accounts.student_id
       WHERE accounts.email = ? AND students.student_code = ?`,
      [normalizedEmail, normalizedCode]
    );
    if (rows.length === 0 || !(await verifyPassword(password, rows[0].password))) {
      return res.status(401).json({ success: false, message: 'Invalid email, student code, or password.' });
    }
    const student = { ...rows[0] };
    delete student.password;
    res.json({ success: true, student });
  } catch (error) {
    console.error('Student login failed:', error);
    res.status(500).json({ success: false, message: 'Unable to sign in right now.' });
  }
};

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
        `INSERT INTO Attendance (enrollment_id, session_id, attendance_date, status)
         VALUES (?, ?, CURDATE(), 'PRESENT')`,
        [enrollmentId, activeSession.session_id]
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
        t.name AS teacher_name, cl.academic_year, cl.semester,
        COALESCE(a.attendance_date, CURDATE()) AS attendance_date, 
        COALESCE(a.status, 'ABSENT') AS status
      FROM Students st
      INNER JOIN Enrollments e ON st.student_id = e.student_id
      INNER JOIN Classes cl ON e.class_id = cl.class_id
      INNER JOIN Courses co ON cl.course_id = co.course_id
      INNER JOIN Teachers t ON cl.teacher_id = t.teacher_id
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