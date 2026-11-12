const db = require('../config/db');
const { hashPassword, verifyPassword } = require('../utils/password');
const { createAdminSession } = require('../utils/adminSession');

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedEmail || typeof password !== 'string' || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT admin_id, name, email, password FROM Admins WHERE email = ?',
      [normalizedEmail]
    );
    if (rows.length === 0 || !(await verifyPassword(password, rows[0].password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    const admin = { ...rows[0] };
    delete admin.password;
    res.json({ success: true, admin, token: createAdminSession(admin.admin_id) });
  } catch (error) {
    console.error('Admin login failed:', error);
    res.status(500).json({ success: false, message: 'Unable to sign in right now.' });
  }
};

exports.getStudents = async (_req, res) => {
  try {
    const [students] = await db.query(
      `SELECT students.student_id, students.student_code, students.name_myanmar,
              students.email, students.username, accounts.name,
              accounts.created_at AS account_created_at
       FROM Students students
       LEFT JOIN StudentAccounts accounts ON accounts.student_id = students.student_id
       ORDER BY students.student_code`
    );
    res.json({ success: true, students });
  } catch (error) {
    console.error('Unable to load student roster:', error);
    res.status(500).json({ success: false, message: 'Unable to load students right now.' });
  }
};

exports.createStudent = async (req, res) => {
  const {
    name,
    name_myanmar: nameMyanmar,
    student_code: studentCode,
    email,
    username,
    password
  } = req.body || {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanMyanmarName = typeof nameMyanmar === 'string' ? nameMyanmar.trim() : '';
  const cleanStudentCode = typeof studentCode === 'string'
    ? studentCode.replace(/\s+/g, '').toUpperCase()
    : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanUsername = typeof username === 'string' ? username.trim() : '';

  if (!cleanName || !cleanMyanmarName || !cleanStudentCode || !cleanEmail || !cleanUsername
      || typeof password !== 'string' || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, Myanmar name, student code, email, username, and password are required.'
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [studentResult] = await connection.query(
      'INSERT INTO Students (student_code, name_myanmar, email, username) VALUES (?, ?, ?, ?)',
      [cleanStudentCode, cleanMyanmarName, cleanEmail, cleanUsername]
    );
    await connection.query(
      'INSERT INTO StudentAccounts (student_id, name, email, password) VALUES (?, ?, ?, ?)',
      [studentResult.insertId, cleanName, cleanEmail, await hashPassword(password)]
    );
    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Student registered. Share the login details with the student.',
      student: {
        student_id: studentResult.insertId,
        student_code: cleanStudentCode,
        name: cleanName,
        name_myanmar: cleanMyanmarName,
        email: cleanEmail,
        username: cleanUsername,
        account_created_at: new Date()
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'That student code or email is already registered.'
      });
    }
    console.error('Unable to register student:', error);
    res.status(500).json({ success: false, message: 'Unable to register student right now.' });
  } finally {
    if (connection) connection.release();
  }
};

exports.updateStudent = async (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!Number.isSafeInteger(studentId) || studentId < 1) {
    return res.status(400).json({ success: false, message: 'A valid student ID is required.' });
  }

  const {
    name,
    name_myanmar: nameMyanmar,
    student_code: studentCode,
    email,
    username,
    password
  } = req.body || {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanMyanmarName = typeof nameMyanmar === 'string' ? nameMyanmar.trim() : '';
  const cleanStudentCode = typeof studentCode === 'string'
    ? studentCode.replace(/\s+/g, '').toUpperCase()
    : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanUsername = typeof username === 'string' ? username.trim() : '';
  const updatePassword = typeof password === 'string' && password.length > 0;

  if (!cleanName || !cleanMyanmarName || !cleanStudentCode || !cleanEmail || !cleanUsername) {
    return res.status(400).json({
      success: false,
      message: 'Name, Myanmar name, student code, email, and username are required.'
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }
  if (password !== undefined && typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'Password must be text.' });
  }
  if (updatePassword && password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [existingStudents] = await connection.query(
      `SELECT students.student_id, accounts.student_id AS account_student_id,
              accounts.created_at AS account_created_at
       FROM Students students
       LEFT JOIN StudentAccounts accounts ON accounts.student_id = students.student_id
       WHERE students.student_id = ?
       FOR UPDATE`,
      [studentId]
    );
    if (existingStudents.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    await connection.query(
      'UPDATE Students SET student_code = ?, name_myanmar = ?, email = ?, username = ? WHERE student_id = ?',
      [cleanStudentCode, cleanMyanmarName, cleanEmail, cleanUsername, studentId]
    );
    const existingAccount = existingStudents[0].account_student_id !== null;
    if (existingAccount) {
      if (updatePassword) {
        await connection.query(
          'UPDATE StudentAccounts SET name = ?, email = ?, password = ? WHERE student_id = ?',
          [cleanName, cleanEmail, await hashPassword(password), studentId]
        );
      } else {
        await connection.query(
          'UPDATE StudentAccounts SET name = ?, email = ? WHERE student_id = ?',
          [cleanName, cleanEmail, studentId]
        );
      }
    } else if (updatePassword) {
      await connection.query(
        'INSERT INTO StudentAccounts (student_id, name, email, password) VALUES (?, ?, ?, ?)',
        [studentId, cleanName, cleanEmail, await hashPassword(password)]
      );
    }

    await connection.commit();
    res.json({
      success: true,
      message: 'Student details updated.',
      student: {
        student_id: studentId,
        student_code: cleanStudentCode,
        name: cleanName,
        name_myanmar: cleanMyanmarName,
        email: cleanEmail,
        username: cleanUsername,
        account_created_at: existingAccount
          ? existingStudents[0].account_created_at
          : updatePassword ? new Date() : null
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'That student code or email is already in use.'
      });
    }
    console.error('Unable to update student:', error);
    res.status(500).json({ success: false, message: 'Unable to update student right now.' });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteStudent = async (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!Number.isSafeInteger(studentId) || studentId < 1) {
    return res.status(400).json({ success: false, message: 'A valid student ID is required.' });
  }

  try {
    const [result] = await db.query('DELETE FROM Students WHERE student_id = ?', [studentId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    res.json({ success: true, message: 'Student and related attendance records deleted.' });
  } catch (error) {
    console.error('Unable to delete student:', error);
    res.status(500).json({ success: false, message: 'Unable to delete student right now.' });
  }
};
