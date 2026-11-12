const readline = require('readline');
const db = require('../config/db');
const { hashPassword } = require('../utils/password');

const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (question) => new Promise((resolve) => prompt.question(question, resolve));

async function createAdmin() {
  const name = (await ask('Admin name: ')).trim();
  const email = (await ask('Admin email: ')).trim().toLowerCase();
  const password = await ask('Admin password (at least 6 characters): ');
  if (!name || !email || password.length < 6) {
    throw new Error('A name, valid email, and password of at least 6 characters are required.');
  }

  await db.query(
    'INSERT INTO Admins (name, email, password) VALUES (?, ?, ?)',
    [name, email, await hashPassword(password)]
  );
  console.log(`Admin account created for ${email}.`);
}

createAdmin()
  .catch((error) => {
    console.error('Unable to create admin account:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    prompt.close();
    await db.end();
  });
