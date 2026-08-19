const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root', 
  database: 'attendance_system',
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = db;