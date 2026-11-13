const db = require('../config/db');
const { hashPassword, verifyPassword } = require('../utils/password');
const { createAdminSession } = require('../utils/adminSession');
const { createHash, randomBytes } = require('crypto');
const {
  isValidAcademicPlacement,
  getNextAcademicPlacement
} = require('../utils/academicProgression');

const createActivationCode = () => {
  const code = randomBytes(16).toString('hex');
  return {
    code,
    hash: createHash('sha256').update(code).digest('hex')
  };
};

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
              students.email, students.username, students.academic_year, students.semester,
              accounts.name,
              accounts.student_id AS account_student_id,
              CASE WHEN accounts.password IS NOT NULL
                   THEN COALESCE(accounts.activated_at, accounts.created_at)
                   ELSE NULL
              END AS account_created_at
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
    academic_year: academicYear,
    semester
  } = req.body || {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanMyanmarName = typeof nameMyanmar === 'string' ? nameMyanmar.trim() : '';
  const cleanStudentCode = typeof studentCode === 'string'
    ? studentCode.replace(/\s+/g, '').toUpperCase()
    : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanUsername = typeof username === 'string' ? username.trim() : '';
  const cleanAcademicYear = typeof academicYear === 'string' ? academicYear.trim() : '';
  const cleanSemester = typeof semester === 'string' ? semester.trim() : '';

  if (!cleanName || !cleanMyanmarName || !cleanStudentCode || !cleanEmail || !cleanUsername
      || !cleanAcademicYear || !cleanSemester) {
    return res.status(400).json({
      success: false,
      message: 'Name, Myanmar name, student code, email, username, study year, and semester are required.'
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }
  if (!isValidAcademicPlacement(cleanAcademicYear, cleanSemester)) {
    return res.status(400).json({ success: false, message: 'Choose a valid study year and semester.' });
  }
  let connection;
  try {
    const activation = createActivationCode();
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [studentResult] = await connection.query(
      `INSERT INTO Students
         (student_code, name_myanmar, email, username, academic_year, semester)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cleanStudentCode, cleanMyanmarName, cleanEmail, cleanUsername, cleanAcademicYear, cleanSemester]
    );
    await connection.query(
      `INSERT INTO StudentAccounts
         (student_id, name, email, password, activation_code_hash, activation_expires_at)
       VALUES (?, ?, ?, NULL, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [studentResult.insertId, cleanName, cleanEmail, activation.hash]
    );
    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Student added. Share the activation code with the student privately. It expires in 7 days.',
      student: {
        student_id: studentResult.insertId,
        student_code: cleanStudentCode,
        name: cleanName,
        name_myanmar: cleanMyanmarName,
        email: cleanEmail,
        username: cleanUsername,
        academic_year: cleanAcademicYear,
        semester: cleanSemester,
        account_created_at: null,
        account_student_id: studentResult.insertId,
        activation_code: activation.code
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

exports.regenerateStudentActivationCode = async (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!Number.isSafeInteger(studentId) || studentId < 1) {
    return res.status(400).json({ success: false, message: 'A valid student ID is required.' });
  }

  const activation = createActivationCode();
  try {
    const [result] = await db.query(
      `UPDATE StudentAccounts
       SET activation_code_hash = ?, activation_expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY)
       WHERE student_id = ? AND password IS NULL`,
      [activation.hash, studentId]
    );
    if (result.affectedRows === 0) {
      const [rows] = await db.query(
        'SELECT student_id FROM Students WHERE student_id = ?',
        [studentId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }
      return res.status(409).json({
        success: false,
        message: 'This student does not have a pending account to activate.'
      });
    }

    res.json({
      success: true,
      message: 'New activation code created. Share it with the student privately; it expires in 7 days.',
      activation_code: activation.code
    });
  } catch (error) {
    console.error('Unable to create student activation code:', error);
    res.status(500).json({ success: false, message: 'Unable to create an activation code right now.' });
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
    academic_year: academicYear,
    semester,
    password
  } = req.body || {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanMyanmarName = typeof nameMyanmar === 'string' ? nameMyanmar.trim() : '';
  const cleanStudentCode = typeof studentCode === 'string'
    ? studentCode.replace(/\s+/g, '').toUpperCase()
    : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanUsername = typeof username === 'string' ? username.trim() : '';
  const placementProvided = academicYear !== undefined || semester !== undefined;
  const cleanAcademicYear = typeof academicYear === 'string' ? academicYear.trim() : '';
  const cleanSemester = typeof semester === 'string' ? semester.trim() : '';
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
  if ((academicYear !== undefined && typeof academicYear !== 'string')
      || (semester !== undefined && typeof semester !== 'string')) {
    return res.status(400).json({ success: false, message: 'Study year and semester must be text.' });
  }
  if (placementProvided && (cleanAcademicYear || cleanSemester)
      && !isValidAcademicPlacement(cleanAcademicYear, cleanSemester)) {
    return res.status(400).json({ success: false, message: 'Choose a valid study year and semester, or leave both unassigned.' });
  }
  if (updatePassword && password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [existingStudents] = await connection.query(
      `SELECT students.student_id, students.academic_year, students.semester,
              accounts.student_id AS account_student_id,
              CASE WHEN accounts.password IS NOT NULL
                   THEN COALESCE(accounts.activated_at, accounts.created_at)
                   ELSE NULL
              END AS account_created_at
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
      `UPDATE Students
       SET student_code = ?, name_myanmar = ?, email = ?, username = ?,
           academic_year = ?, semester = ?
       WHERE student_id = ?`,
      [
        cleanStudentCode,
        cleanMyanmarName,
        cleanEmail,
        cleanUsername,
        placementProvided
          ? cleanAcademicYear || null
          : existingStudents[0].academic_year,
        placementProvided
          ? cleanSemester || null
          : existingStudents[0].semester,
        studentId
      ]
    );
    const existingAccount = existingStudents[0].account_student_id !== null;
    if (existingAccount) {
      if (updatePassword) {
        await connection.query(
          `UPDATE StudentAccounts
           SET name = ?, email = ?, password = ?, activated_at = COALESCE(activated_at, NOW()),
               activation_code_hash = NULL, activation_expires_at = NULL
           WHERE student_id = ?`,
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
        'INSERT INTO StudentAccounts (student_id, name, email, password, activated_at) VALUES (?, ?, ?, ?, NOW())',
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
        academic_year: placementProvided
          ? cleanAcademicYear || null
          : existingStudents[0].academic_year,
        semester: placementProvided
          ? cleanSemester || null
          : existingStudents[0].semester,
        account_created_at: updatePassword
          ? new Date()
          : existingStudents[0].account_created_at
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

exports.promoteStudentCohort = async (req, res) => {
  const { academic_year: academicYear, semester } = req.body || {};
  const next = getNextAcademicPlacement(academicYear, semester);
  if (!next) {
    return res.status(400).json({
      success: false,
      message: 'Choose a valid cohort that has a following semester.'
    });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [students] = await connection.query(
      `SELECT student_id
       FROM Students
       WHERE academic_year = ? AND semester = ?
       FOR UPDATE`,
      [academicYear, semester]
    );
    if (students.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'No students were found in that year and semester.'
      });
    }

    await connection.query(
      `UPDATE Students
       SET academic_year = ?, semester = ?
       WHERE academic_year = ? AND semester = ?`,
      [next.academic_year, next.semester, academicYear, semester]
    );
    await connection.commit();
    res.json({
      success: true,
      message: `${students.length} student${students.length === 1 ? '' : 's'} moved to ${next.academic_year}, ${next.semester}.`,
      count: students.length,
      student_ids: students.map((student) => student.student_id),
      from: { academic_year: academicYear, semester },
      to: next
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Unable to advance student cohort:', error);
    res.status(500).json({ success: false, message: 'Unable to advance this student cohort right now.' });
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
