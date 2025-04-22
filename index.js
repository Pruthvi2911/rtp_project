const express = require('express');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const app = express();
const PORT = 3000;
const IP = '192.168.1.18';

let deviceAttendance = {}; // To track which device has marked attendance for which roll number
let currentToken = generateToken();
let attendanceData = {};
let lastTokenUpdate = Date.now();
const TOKEN_REFRESH_INTERVAL = 10000; // 10 seconds

// Body parser middleware
app.use(express.json());
app.use(express.static('public'));

// Mock of valid roll numbers (replace with actual list)
const validRollNumbers = [ /* List of valid roll numbers here... */ ];

// Basic token generation function
function generateToken() {
  return Math.random().toString(36).substr(2, 6);
}

// Function to refresh token if needed
function getTokenAndRefreshIfNeeded() {
  const now = Date.now();
  if (now - lastTokenUpdate >= TOKEN_REFRESH_INTERVAL) {
    currentToken = generateToken();
    lastTokenUpdate = now;
    const link = `http://${IP}:${PORT}/form.html?token=${currentToken}`;
    QRCode.toString(link, { type: 'terminal' }, (err, qr) => {
      if (err) return console.error('QR Code generation failed', err);
      console.clear();
      console.log('🔁 New QR Code generated:');
      console.log(qr);
      console.log(`🔗 Link: ${link}`);
      console.log(`🔑 Token: ${currentToken}`);
    });
  }
  return currentToken;
}

// Serve login page at the root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html')); // Serve login page when accessing the root route
});

// Login route (POST request)
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Basic validation (replace with real authentication logic)
  if (username === 'lecturer' && password === 'password') {
    return res.json({ message: 'Login successful!' });
  } else {
    return res.status(401).json({ message: '❌ Invalid username or password!' });
  }
});

// Lecturer route (show the lecturer dashboard)
app.get('/lecturer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'lecturer.html'));
});

// Other routes...

app.listen(PORT, IP, () => {
  console.log(`✅ Server running at http://${IP}:${PORT}`);
});

