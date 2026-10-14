const db = require('../config/db');

const generateSessionCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const semesterNames = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
const studyYears = ['First Year', 'Second Year', 'Third Year', 'Fourth Year', 'Final Year'];

exports.signup = async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  if (!name?.trim() || !normalizedEmail || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO Teachers (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), normalizedEmail, password]
    );
    res.status(201).json({ success: true, teacher: { teacher_id: result.insertId, name: name.trim(), email: normalizedEmail } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();
  try {
    const [rows] = await db.query('SELECT teacher_id, name, email FROM Teachers WHERE email = ? AND password = ?', [normalizedEmail, password]);
    if (rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    res.json({ success: true, teacher: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Fetch lecturer classes
exports.getClasses = async (req, res) => {
  const { teacher_id } = req.query;
  if (!teacher_id) return res.status(400).json({ error: 'Teacher identity is required.' });
  try {
    const sql = `
      SELECT cl.class_id, co.course_code, co.course_name, t.name AS teacher_name,
             cl.academic_year, cl.semester
      FROM Classes cl
      JOIN Courses co ON cl.course_id = co.course_id
      JOIN Teachers t ON cl.teacher_id = t.teacher_id
      WHERE cl.teacher_id = ?
      ORDER BY co.course_code ASC;
    `;
    const [rows] = await db.query(sql, [teacher_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCourse = async (req, res) => {
  const { teacher_id, course_code, course_name, is_elective = false, academic_year = 'First Year', semester = 'Semester I' } = req.body;
  if (!teacher_id || !course_code?.trim() || !course_name?.trim()) {
    return res.status(400).json({ error: 'Teacher, course code, and course name are required.' });
  }
  const yearIndex = typeof academic_year === 'string' ? studyYears.indexOf(academic_year) : -1;
  const semesterIndex = typeof semester === 'string'
    ? semesterNames.findIndex((roman) => semester === `Semester ${roman}`) + 1
    : 0;
  const validSemesters = yearIndex === 4
    ? [9]
    : [yearIndex * 2 + 1, yearIndex * 2 + 2];
  if (yearIndex === -1 || !validSemesters.includes(semesterIndex)) {
    return res.status(400).json({ error: 'Choose a valid study year and semester.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [courseResult] = await connection.query(
      'INSERT INTO Courses (course_code, course_name, is_elective) VALUES (?, ?, ?)',
      [course_code.trim().toUpperCase(), course_name.trim(), Boolean(is_elective)]
    );
    const [classResult] = await connection.query(
      `INSERT INTO Classes (course_id, teacher_id, academic_year, semester)
       SELECT ?, teacher_id, ?, ? FROM Teachers WHERE teacher_id = ?`,
      [courseResult.insertId, academic_year, semester, teacher_id]
    );
    if (classResult.affectedRows === 0) throw new Error('Teacher account not found.');
    await connection.commit();
    res.status(201).json({ success: true, class_id: classResult.insertId, course_id: courseResult.insertId });
  } catch (err) {
    await connection.rollback();
    res.status(err.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

exports.deleteCourse = async (req, res) => {
  const { class_id } = req.params;
  const { teacher_id } = req.query;
  if (!teacher_id) return res.status(400).json({ error: 'Teacher identity is required.' });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [classes] = await connection.query(
      'SELECT course_id FROM Classes WHERE class_id = ? AND teacher_id = ?',
      [class_id, teacher_id]
    );
    if (classes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Course not found or it does not belong to you.' });
    }

    await connection.query('DELETE FROM Classes WHERE class_id = ?', [class_id]);
    await connection.query('DELETE FROM Courses WHERE course_id = ?', [classes[0].course_id]);
    await connection.commit();
    res.json({ success: true, message: 'Course deleted successfully.' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

// Start live attendance session
exports.startSession = async (req, res) => {
  const { class_id, teacher_id, duration_minutes = 10 } = req.body;
  if (!teacher_id) return res.status(400).json({ error: 'Teacher identity is required.' });

  try {
    const [ownedClasses] = await db.query('SELECT class_id FROM Classes WHERE class_id = ? AND teacher_id = ?', [class_id, teacher_id]);
    if (ownedClasses.length === 0) return res.status(403).json({ error: 'You can only open sessions for your own classes.' });
    await db.query('UPDATE AttendanceSessions SET is_active = FALSE WHERE class_id = ?', [class_id]);

    const sessionCode = generateSessionCode();
    const expiresAt = new Date(Date.now() + duration_minutes * 60 * 1000);

    const [result] = await db.query(
      'INSERT INTO AttendanceSessions (class_id, session_code, expires_at, is_active) VALUES (?, ?, ?, TRUE)',
      [class_id, sessionCode, expiresAt]
    );

    res.json({
      success: true,
      session_id: result.insertId,
      session_code: sessionCode,
      expires_at: expiresAt,
      message: `Session open. Code: ${sessionCode}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Close live session
exports.closeSession = async (req, res) => {
  const { session_id, teacher_id } = req.body;
  if (!teacher_id) return res.status(400).json({ error: 'Teacher identity is required.' });
  try {
    const [result] = await db.query(
      `UPDATE AttendanceSessions sessions
       JOIN Classes classes ON sessions.class_id = classes.class_id
       SET sessions.is_active = FALSE
       WHERE sessions.session_id = ? AND classes.teacher_id = ?`,
      [session_id, teacher_id]
    );
    if (result.affectedRows === 0) return res.status(403).json({ error: 'You can only close your own sessions.' });
    res.json({ success: true, message: 'Session closed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT teacher_id, name, email, created_at FROM Teachers WHERE teacher_id = ?', [req.params.teacherId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Teacher profile not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required.' });
  try {
    await db.query('UPDATE Teachers SET name = ? WHERE teacher_id = ?', [name.trim(), req.params.teacherId]);
    const [rows] = await db.query('SELECT teacher_id, name, email, created_at FROM Teachers WHERE teacher_id = ?', [req.params.teacherId]);
    res.json({ success: true, teacher: rows[0] });
  } catch (err) {
    res.status(err.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ error: err.code === 'ER_DUP_ENTRY' ? 'That email is already in use.' : err.message });
  }
};

exports.getClassStudents = async (req, res) => {
  const { teacher_id } = req.query;
  try {
    const [ownedClasses] = await db.query('SELECT class_id FROM Classes WHERE class_id = ? AND teacher_id = ?', [req.params.classId, teacher_id]);
    if (ownedClasses.length === 0) return res.status(403).json({ error: 'You can only manage students in your own classes.' });
    const [rows] = await db.query(
      `SELECT s.student_id, s.student_code, s.name_myanmar, s.email, s.username
       FROM Enrollments e JOIN Students s ON e.student_id = s.student_id
       WHERE e.class_id = ? ORDER BY s.student_code`,
      [req.params.classId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addStudentToClass = async (req, res) => {
  const { teacher_id, student_code } = req.body;
  const normalizedStudentCode = student_code?.replace(/\s+/g, '').toUpperCase();
  try {
    const [ownedClasses] = await db.query('SELECT class_id FROM Classes WHERE class_id = ? AND teacher_id = ?', [req.params.classId, teacher_id]);
    if (ownedClasses.length === 0) return res.status(403).json({ error: 'You can only manage students in your own classes.' });
    const [students] = await db.query('SELECT student_id, student_code, name_myanmar, email, username FROM Students WHERE student_code = ?', [normalizedStudentCode]);
    if (students.length === 0) return res.status(404).json({ error: 'Student code not found.' });
    await db.query('INSERT INTO Enrollments (student_id, class_id) VALUES (?, ?)', [students[0].student_id, req.params.classId]);
    res.status(201).json({ success: true, student: students[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Student is already enrolled in this course.' });
    res.status(500).json({ error: err.message });
  }
};

exports.removeStudentFromClass = async (req, res) => {
  const { teacher_id } = req.query;
  try {
    const [ownedClasses] = await db.query('SELECT class_id FROM Classes WHERE class_id = ? AND teacher_id = ?', [req.params.classId, teacher_id]);
    if (ownedClasses.length === 0) return res.status(403).json({ error: 'You can only manage students in your own classes.' });
    await db.query('DELETE FROM Enrollments WHERE class_id = ? AND student_id = ?', [req.params.classId, req.params.studentId]);
    res.json({ success: true, message: 'Student removed from course.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMonthlyAttendance = async (req, res) => {
  const { teacher_id, month } = req.query;
  const monthStart = month ? `${month}-01` : `${new Date().toISOString().slice(0, 7)}-01`;
  if (!/^\d{4}-\d{2}-01$/.test(monthStart)) return res.status(400).json({ error: 'Month must use YYYY-MM format.' });

  try {
    const [ownedClasses] = await db.query(
      'SELECT class_id FROM Classes WHERE class_id = ? AND teacher_id = ?',
      [req.params.classId, teacher_id]
    );
    if (ownedClasses.length === 0) return res.status(403).json({ error: 'You can only view attendance for your own classes.' });

    const [rows] = await db.query(
      `SELECT
         s.student_id,
         s.student_code,
         s.name_myanmar,
         DATE_FORMAT(a.attendance_date, '%Y-%m-%d') AS attendance_date_key,
         DATE_FORMAT(a.attendance_date, '%e/%c') AS attendance_date_label,
         a.status
       FROM Enrollments e
       JOIN Students s ON s.student_id = e.student_id
       LEFT JOIN Attendance a
         ON a.enrollment_id = e.enrollment_id
        AND a.attendance_date >= ?
        AND a.attendance_date < DATE_ADD(?, INTERVAL 1 MONTH)
       WHERE e.class_id = ?
       ORDER BY s.student_code, a.attendance_date`,
      [monthStart, monthStart, req.params.classId]
    );

    const attendanceDates = [...new Map(
      rows
        .filter((row) => row.attendance_date_key)
        .map((row) => [row.attendance_date_key, row.attendance_date_label])
    ).entries()].sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate));

    const dateSlots = new Map(
      attendanceDates.map(([dateKey, dateLabel], index) => [dateKey, { slot: index + 1, label: dateLabel }])
    );

    const students = new Map();
    rows.forEach((row) => {
      if (!students.has(row.student_id)) {
        students.set(row.student_id, {
          student_id: row.student_id,
          student_code: row.student_code,
          name_myanmar: row.name_myanmar,
          present_days: 0,
          absent_days: 0,
          days: {},
          attendance_dates: {}
        });
      }

      if (row.attendance_date_key && dateSlots.has(row.attendance_date_key)) {
        const student = students.get(row.student_id);
        const dateSlot = dateSlots.get(row.attendance_date_key);
        student.days[dateSlot.slot] = row.status;
        student.attendance_dates[dateSlot.slot] = dateSlot.label;

        if (row.status === 'PRESENT') student.present_days += 1;
        if (row.status === 'ABSENT') student.absent_days += 1;
      }
    });

    res.json({
      month: monthStart.slice(0, 7),
      attendance_dates: attendanceDates.map(([, label]) => label),
      students: [...students.values()]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.registerStudentToClass = async (req, res) => {
  const { teacher_id, student_code, name_myanmar, email, username } = req.body;
  if (!teacher_id || !student_code?.trim() || !name_myanmar?.trim() || !email?.trim() || !username?.trim()) {
    return res.status(400).json({ error: 'Student code, name, email, and username are required.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [ownedClasses] = await connection.query('SELECT class_id FROM Classes WHERE class_id = ? AND teacher_id = ?', [req.params.classId, teacher_id]);
    if (ownedClasses.length === 0) {
      await connection.rollback();
      return res.status(403).json({ error: 'You can only manage students in your own classes.' });
    }
    const [studentResult] = await connection.query(
      'INSERT INTO Students (student_code, name_myanmar, email, username) VALUES (?, ?, ?, ?)',
      [student_code.replace(/\s+/g, '').toUpperCase(), name_myanmar.trim(), email.trim().toLowerCase(), username.trim()]
    );
    await connection.query('INSERT INTO Enrollments (student_id, class_id) VALUES (?, ?)', [studentResult.insertId, req.params.classId]);
    await connection.commit();
    res.status(201).json({
      success: true,
      student: { student_id: studentResult.insertId, student_code: student_code.replace(/\s+/g, '').toUpperCase(), name_myanmar: name_myanmar.trim(), email: email.trim().toLowerCase(), username: username.trim() }
    });
  } catch (err) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Student code already exists or is already enrolled.' });
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};