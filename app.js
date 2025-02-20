const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const correctPasscode = 'PUT_YOUR_PASSCODE_HERE';
const hashPasscode = crypto.createHash('sha256').update(correctPasscode).digest('hex');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: true
}));

app.use((req, res, next) => {
  if (typeof req.session.notification === 'undefined') {
    req.session.notification = "";
  }
  next();
});

// Function to log unauthorized access attempts (only IP & accurate browser details)
function logUnauthorizedAccess(req, reason) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  const logEntry = {
    timestamp: new Date().toISOString(),
    ip: ip,
    browser: userAgent,
    reason: reason // "Wrong passcode attempt" or "Unauthorized URL jump"
  };

  console.log('Unauthorized access attempt logged:', logEntry);

  fs.readFile('UserInfo.json', (err, data) => {
    let logs = [];
    if (!err && data && data.length > 0) {
      logs = JSON.parse(data);
    }
    logs.push(logEntry);
    fs.writeFile('UserInfo.json', JSON.stringify(logs, null, 2), err => {
      if (err) console.error('Error writing to UserInfo.json:', err);
    });
  });
}

// Middleware to protect the /home route
function checkAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  } else {
    req.session.notification = "Unauthorized access. Please login first.";
    logUnauthorizedAccess(req, "Unauthorized URL jump");
    return res.redirect('/');
  }
}

// Routes

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/session-notification', (req, res) => {
  const message = req.session.notification || "";
  req.session.notification = "";
  res.send(message);
});

app.post('/login', (req, res) => {
  const userPasscode = req.body.passcode;
  const hashedInput = crypto.createHash('sha256').update(userPasscode).digest('hex');

  if (hashedInput === hashPasscode) {
    req.session.authenticated = true;
    req.session.failedAttempts = 0;
    return res.redirect('/home');
  } else {
    req.session.failedAttempts = (req.session.failedAttempts || 0) + 1;
    if (req.session.failedAttempts > 1) {
      logUnauthorizedAccess(req, "Wrong passcode attempt");
    }
    req.session.notification = "Incorrect passcode. Please try again.";
    return res.redirect('/');
  }
});

app.get('/home', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'home', 'index.html'));
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
