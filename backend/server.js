const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const os = require('os');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const studentRoutes = require('./routes/studentRoutes');
const Student = require('./models/Student');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: '*', // Allow all origins for development; lock to React origin in production
    methods: ['GET', 'POST']
  }
});

// Attach socket.io to the application context so controllers can emit events
app.set('socketio', io);

// Connect to Database
connectDB().then(() => {
  seedStudents(); // Seed roll numbers if DB is empty
  seedLecturer(); // Seed default lecturer if DB is empty
});

// Dynamic Local IP Detection
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
const IP = getLocalIP();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet());
app.use(cors({ origin: '*' })); // Allow requests from all origins (React frontend / Flutter mobile)
app.use(express.json());

// API Rate Limiting (100 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes.'
});
app.use('/api/', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/student', studentRoutes);

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Seed students from original list if none exist
async function seedStudents() {
  try {
    const count = await Student.countDocuments();
    if (count > 0) return;

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

    const studentDocs = validRollNumbers.map(roll => ({
      rollNumber: roll,
      name: `Student ${roll.slice(-2)}`,
      email: `${roll.toLowerCase()}@mgit.edu.in`
    }));

    await Student.insertMany(studentDocs);
    console.log('✅ Standard Student roll numbers successfully seeded into MongoDB.');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  }
}

// Seed default lecturer if none exist
async function seedLecturer() {
  try {
    const count = await User.countDocuments({ email: 'lecturer@mgit.edu.in' });
    if (count > 0) return;

    await User.create({
      name: 'MGIT Lecturer',
      email: 'lecturer@mgit.edu.in',
      passwordHash: 'password' // Pre-save hooks hashes this automatically
    });
    console.log('✅ Default Lecturer successfully seeded. Username: lecturer@mgit.edu.in, Password: password');
  } catch (error) {
    console.error('❌ Lecturer seeding failed:', error.message);
  }
}

// Start Server listening on all interfaces (0.0.0.0) but displaying local host details
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend Server listening on port ${PORT}`);
  console.log(`📡 Local Network Access: http://${IP}:${PORT}`);
  console.log(`🏠 Local Host Access:    http://localhost:${PORT}`);
});
