// GOLDEN FIXTURE (synthetic) — planted vulnerabilities for review-security.
// Expected findings: SQL injection (string-concatenated query), a hardcoded
// secret, and missing input validation. Values are fake.

const db = require('./db');

const API_KEY = 'sk-live-fake1234567890abcdef';   // planted: hardcoded secret

async function login(req, res) {
  const { username, password } = req.body;        // planted: no validation
  // planted: SQL injection — user input concatenated straight into the query
  const row = await db.query(
    "SELECT * FROM users WHERE name = '" + username + "' AND pass = '" + password + "'"
  );
  if (row) {
    res.send('<h1>Welcome ' + username + '</h1>');  // planted: reflected XSS
    return;
  }
  res.status(401).send('nope');
}

module.exports = { login, API_KEY };
