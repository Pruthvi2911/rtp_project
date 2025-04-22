const express = require('express');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const os = require('os'); // ✅ Added for dynamic IP
const app = express();
const PORT = 3000;

// ✅ Dynamically detect local IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const IP = getLocalIP(); // ✅ Replaced static IP with dynamic one

app.use(express.json());
app.use(express.static('public'));

const validRollNumbers = [
  '23261A05C8', '23261A05C9', '23261A05D0', '23261A05D1', '23261A05D2', '23261A05D3',
  '23261A05D4', '23261A05D5', '23261A05D6', '23261A05D7', '23261A05D8', '23261A05D9',
  '23261A05E0', '23261A05E1', '23261A05E2', '23261A05E3', '23261A05E4', '23261A05E5',
  '23261A05E6', '23261A05E7', '23261A05E8', '23261A05E9', '23261A05F0', '23261A05F1',
  '23261A05F2', '23261A05F3', '23261A05F4', '23261A05F5', '23261A05F6', '23261A05F7',
  '23261A05F8', '23261A05F9', '23261A05G0', '23261A05G1', '23261A05G2', '23261A05G3',
  '23261A05G4', '23261A05G5', '23261A05G6', '23261A05G7', '23261A05G8', '23261A05G9',
  '23261A05H0', '23261A05H1', '23261A05H2', '23261A05H3', '23261A05H4', '23261A05H5',
  '23261A05H6', '23261A05H7', '23261A05H8', '23261A05H9', '23261A05I0', '23261A05I1',
  '23261A05I2', '23261A05I3', '23261A05I4', '23261A05I5', '23261A05I6', '23261A05I7',
  '23261A05I8', '23261A05I9', '23261A05J0', '23261A05J1', '23261A05J2', '23261A05J3',
  '23261A05J4', '23261A05J5', '23261A05J6', '23261A05J7', '23261A05J8', '23261A05J9',
  '23261A05K0', '23261A05K1', '23261A05K2', '23261A05K3'
];

let currentToken = generateToken();
let attendanceData = {};
let deviceAttendance = {};
let lastTokenUpdate = Date.now();
const TOKEN_REFRESH_INTERVAL = 10000;

function generateToken() {
  return Math.random().toString(36).substr(2, 6);
}

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

app.post('/submit-attendance', (req, res) => {
  const { rollNumber, token } = req.body;
  const deviceIp = req.ip;

  console.log(`Attendance submission: ${rollNumber} with token ${token}`);
  console.log(`Current token is: ${currentToken}`);
  
  if (token !== currentToken) {
    return res.json({ message: '❌ Invalid or expired token!' });
  }
  if (!validRollNumbers.includes(rollNumber)) {
    return res.json({ message: '❌ Invalid roll number!' });
  }
  
  if (deviceAttendance[deviceIp] && deviceAttendance[deviceIp] !== rollNumber) {
    return res.json({ message: '❌ You can only mark attendance for one roll number!' });
  }

  attendanceData[rollNumber] = 'Present';
  deviceAttendance[deviceIp] = rollNumber;

  res.json({ message: '✅ Attendance marked successfully!' });
});

app.get('/download', (req, res) => {
  const filePath = path.join(__dirname, 'attendance.csv');
  const csvData = validRollNumbers.map(roll => `${roll},${attendanceData[roll] || 'Absent'}`).join('\n');
  fs.writeFileSync(filePath, csvData);
  res.download(filePath);
});

app.get('/api/get-qr', async (req, res) => {
  const token = getTokenAndRefreshIfNeeded();
  const link = `http://${IP}:${PORT}/form.html?token=${token}`;
  const qr = await QRCode.toDataURL(link);
  res.json({ link, qr, token });
});

app.get('/current-token', async (req, res) => {
  const token = getTokenAndRefreshIfNeeded();
  const link = `http://${IP}:${PORT}/form.html?token=${token}`;
  const qrImage = await QRCode.toDataURL(link);
  res.json({ link, qrImage, token });
});

app.get('/lecturer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'lecturer.html'));
});

app.get('/api/attendance-count', (req, res) => {
  const presentCount = Object.values(attendanceData).filter(status => status === 'Present').length;
  res.json({ count: presentCount, total: validRollNumbers.length });
});

app.listen(PORT, IP, () => {
  console.log(`✅ Server running at http://${IP}:${PORT}`);
  console.log(`🔗 Lecturer interface available at http://${IP}:${PORT}/lecturer`);
});
