const db = require('../config/db');

const generateSessionCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Fetch lecturer classes
exports.getClasses = async (req, res) => {
  try {
    const sql = `
      SELECT cl.class_id, co.course_code, co.course_name, cl.teacher_name, cl.room_number
      FROM Classes cl
      JOIN Courses co ON cl.course_id = co.course_id
      ORDER BY co.course_code ASC;
    `;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Start live attendance session
exports.startSession = async (req, res) => {
  const { class_id, duration_minutes = 10 } = req.body;

  try {
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
  const { session_id } = req.body;
  try {
    await db.query('UPDATE AttendanceSessions SET is_active = FALSE WHERE session_id = ?', [session_id]);
    res.json({ success: true, message: 'Session closed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};