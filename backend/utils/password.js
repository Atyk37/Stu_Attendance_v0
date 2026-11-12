const { randomBytes, scrypt, timingSafeEqual } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

exports.hashPassword = async (password) => {
  const salt = randomBytes(16).toString('hex');
  const key = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt:${salt}:${key.toString('hex')}`;
};

exports.verifyPassword = async (password, storedPassword) => {
  if (!storedPassword) return false;

  const [scheme, salt, storedKey] = storedPassword.split(':');
  if (scheme !== 'scrypt' || !salt || !storedKey) {
    const provided = Buffer.from(password);
    const stored = Buffer.from(storedPassword);
    return provided.length === stored.length && timingSafeEqual(provided, stored);
  }

  const expectedKey = Buffer.from(storedKey, 'hex');
  if (expectedKey.length !== KEY_LENGTH) return false;
  const suppliedKey = await scryptAsync(password, salt, KEY_LENGTH);
  return timingSafeEqual(suppliedKey, expectedKey);
};
