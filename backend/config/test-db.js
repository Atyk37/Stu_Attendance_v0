const db = require('./db');

async function testConnection() {
  try {
    const connection = await db.getConnection();
    console.log('✅ MySQL Database connected successfully!');
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();