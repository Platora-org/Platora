// set_test_password.mjs
import bcrypt from 'bcrypt';
import db from './config/db.js'; // keep this path if your db.js is at server/config/db.js

const EMAIL = 'it23634558@my.sliit.lk'; // <- replace
const NEW_PLAIN = 'Test1234';                 // <- choose a password you want

(async () => {
  try {
    const hash = await bcrypt.hash(NEW_PLAIN, 10);
    const q = `UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email`;
    const res = await db.query(q, [hash, EMAIL]);
    if (res.rowCount === 0) {
      console.log('No user found with that email.');
    } else {
      console.log('Password updated for', res.rows[0].email);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
