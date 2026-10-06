# Production-Grade MERN Stack Migration: A Self-Guided Learning Roadmap

Welcome to your structured roadmap! This document is designed to guide you step-by-step through migrating the simple, volatile QR attendance prototype to a production-grade **MERN (MongoDB, Express, React, Node.js)** stack project. 

Instead of writing all the code for you, this guide acts as a checklist, teaching assistant, and code skeleton provider. You will build each piece yourself, understand *why* you are building it, and learn the architectural concepts behind it.

---

## Roadmap Overview

Here is the directory structure you will build. We will split the project into a clean front-and-back architecture:

```text
rtp_project/
├── backend/
│   ├── config/             # Database connection, env configs
│   ├── controllers/        # Request handlers (auth, attendance, session)
│   ├── middleware/         # Auth guards, security limits, error handers
│   ├── models/             # Mongoose schemas (User, Student, Session, Attendance)
│   ├── routes/             # Express routing endpoints
│   ├── .env                # Secret keys, DB URI (gitignored!)
│   ├── package.json
│   └── server.js           # Server entry point
├── frontend/               # React (Vite SPA) project
│   ├── src/
│   │   ├── components/     # Reusable UI elements (QR, Dashboard widgets)
│   │   ├── context/        # Auth and Session state providers
│   │   ├── pages/          # Login, Lecturer Dashboard, Student Form
│   │   └── App.jsx
│   └── package.json
└── learning_roadmap.md     # This roadmap
```

---

## Phase 1: Repository Cleanup & Project Scaffolding

### Step 1.1: Resolve Git Conflicts & Clean Up Current Files
*   **Goal**: Clean up the current HTML files in the `public` folder that have merge conflict markers.
*   **Reason**: Leaving conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>>`) causes syntax errors. They must be resolved so we have a clean reference of the old UI if we need it.
*   **What to Learn / Research**: 
    *   *Search query*: "How to resolve git merge conflicts in VS Code"
    *   *Search query*: "Three-way merge in Git"
*   **Action Items**:
    1. Open [lecturer.html](file:///d:/qr/public/lecturer.html). Look at the styles and scripts inside the conflict blocks. Select the dark mode code block (marked with the `8aaac75b7fd8...` tag, featuring the MGIT logo) as your baseline, clean out the conflict tags, and save the file.
    2. Repeat the process for [form.html](file:///d:/qr/public/form.html), [qr.html](file:///d:/qr/public/qr.html), and [class.html](file:///d:/qr/public/class.html). Ensure they are clean HTML files.

### Step 1.2: Restructure Directories
*   **Goal**: Separate client code from server code.
*   **Reason**: In production, backend APIs and frontend React apps are separate. Mixing them makes code organization, routing, and deployment extremely difficult.
*   **Action Items**:
    1. Create a folder named `backend`.
    2. Move [server.js](file:///d:/qr/server.js) into `backend/`.
    3. Move `package.json` and `package-lock.json` into `backend/`.
    4. Move the `public/` directory into `backend/` (this will serve as our temporary fallback frontend until we build the React SPA).
    5. Delete the redundant [index.js](file:///d:/qr/index.js) in the root of the project to prevent confusion.

---

## Phase 2: Database Layer (MongoDB & Mongoose)

### Step 2.1: Establish Database Connection
*   **Goal**: Connect your Node/Express app to MongoDB using Mongoose.
*   **Reason**: Storing data in memory (`let attendanceData = {}`) means everything resets when the server restarts. We need a persistent, transaction-safe database.
*   **What to Learn / Research**:
    *   *Concepts*: MongoDB collections, Mongoose ODM, connection pooling.
    *   *Search query*: "Mongoose best practices connection file structure"
*   **Where to Write**: Create `backend/config/db.js`
*   **Action Items**: Write a function that connects to MongoDB using a connection string loaded from an environment variable (`process.env.MONGO_URI`).
```javascript
// backend/config/db.js - Skeleton
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // Stop server if database connection fails
  }
};

module.exports = connectDB;
```

### Step 2.2: Define Mongoose Schemas (Models)
*   **Goal**: Create Mongoose schemas to structure the collections.
*   **Reason**: Unlike relational SQL databases, MongoDB is schema-less. Define schemas at the application layer using Mongoose to enforce data integrity (e.g. checking that email is formatted, roll number is unique).
*   **What to Learn / Research**:
    *   *Concepts*: Mongoose Schema types, validators, relational mapping (referencing `ObjectId`).
    *   *Search query*: "Mongoose objectId ref" or "Mongoose unique index sparse".
*   **Where to Write**: Create files in a new directory `backend/models/`:
    1. `User.js` (For Lecturers)
    2. `Student.js` (For Students)
    3. `Session.js` (For active QR codes and class sessions)
    4. `Attendance.js` (For recording student check-ins)

*   **Skeleton Code Examples**:
```javascript
// backend/models/Student.js - Skeleton
const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  // 💡 Crucial for Flutter device binding to prevent proxies
  deviceId: { type: String, default: null }, 
  deviceModel: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', StudentSchema);
```

```javascript
// backend/models/Attendance.js - Skeleton
const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  rollNumber: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['Present', 'Absent'], default: 'Present' },
  verificationMethod: { type: String, enum: ['QR_App', 'Manual'], default: 'QR_App' }
});

// Ensure a student can only have one attendance record per session!
AttendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
```

---

## Phase 3: Backend Security & Core Express Routes

### Step 3.1: Enforce Security Middlewares
*   **Goal**: Add Helmet, CORS, and Rate Limiting to Express.
*   **Reason**: Production APIs are vulnerable to cross-site scripting (XSS), cross-origin requests from unauthorized domains, and denial-of-service (DoS) brute-forcing.
*   **What to Learn / Research**:
    *   *Concepts*: CORS (Cross-Origin Resource Sharing), HTTP response security headers, IP rate limiting.
    *   *Search query*: "Express rate limit configuration" or "How helmet middleware protects express applications".
*   **Where to Write**: Install using `npm install helmet cors express-rate-limit dotenv` in `backend`, then load them in `backend/server.js`.
*   **Action Items**:
    1. Configure CORS to only allow requests from your React client's domain.
    2. Add `express-rate-limit` to limit requests to `/api/auth/login` and `/api/attendance/submit`.

### Step 3.2: Lecturer Auth & Route Guard (JWT + Bcrypt)
*   **Goal**: Register/Login lecturers securely and restrict dashboard routes.
*   **Reason**: The prototype has no dashboard protection. We must encrypt passwords in the database using salted hashes and issue stateless JWT tokens to verify who is calling the endpoints.
*   **What to Learn / Research**:
    *   *Concepts*: Cryptographic salting and hashing, JWT structure (Header, Payload, Signature), HTTP Authorization header (`Bearer <token>`).
    *   *Search query*: "Why you should use bcryptjs instead of bcrypt", "JWT security best practices".
*   **Where to Write**: Create `backend/middleware/authMiddleware.js` and `backend/controllers/authController.js`.
*   **Action Items**:
    1. Write a verification middleware to extract the Bearer token from the `Authorization` header and decode it.
```javascript
// backend/middleware/authMiddleware.js - Skeleton
const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // Attach user payload to request object
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
```

### Step 3.3: Cryptographically Secure QR Token Refresh
*   **Goal**: Generate secure, short-lived tokens for QR codes.
*   **Reason**: Using `Math.random().toString(36)` is predictable. A student sitting in the back could reverse-engineer or brute force the pattern. 
*   **What to Learn / Research**:
    *   *Concepts*: PRNG (Pseudo-random) vs CSPRNG (Cryptographically Secure Pseudo-random number generators).
    *   *Search query*: "Nodejs crypto randombytes vs math random".
*   **Where to Write**: In your session creation/refresh controller (e.g. `backend/controllers/sessionController.js`).
*   **Action Items**:
    1. Use the native `crypto` module: `crypto.randomBytes(32).toString('hex')` for high entropy tokens.
    2. Write a cron-job or server tick that rotates the token in the Active Session database entry every 10 seconds.

---

## Phase 4: Flutter Mobile API Setup (Building the Stubs)

> [!IMPORTANT]
> The Flutter application will be built later, but we need to lay down the API foundations (placeholders/stubs) in our Express app now. This ensures the full-stack design remains cohesive.

### Step 4.1: The Device Registration Endpoint
*   **Goal**: Create an endpoint that binds a student's roll number to a physical hardware ID.
*   **Reason**: Prevents "Proxy Attendance". If a student is absent, they might send their login credentials to a classmate to mark them present. By pinning a student to a specific device hardware ID, they can only submit attendance from their *own* phone.
*   **Where to Write**: Create `backend/routes/studentRoutes.js` and add a `/api/student/register-device` POST route.
*   **Action Items**:
    1. Write the controller to verify if the student exists.
    2. If the student has never registered a device (`deviceId == null`), save the incoming `deviceId` sent by the Flutter client.
    3. If the device ID is already set, verify it matches. If not, reject the registration.

```javascript
// backend/controllers/studentController.js - Skeleton
const Student = require('../models/Student');

const registerDevice = async (req, res) => {
  const { rollNumber, email, deviceId, deviceModel } = req.body;
  try {
    let student = await Student.findOne({ rollNumber });
    if (!student) {
      // For testing, create the student on the fly if not exists
      student = await Student.create({ rollNumber, name: 'Student Name', email });
    }

    if (student.deviceId === null) {
      student.deviceId = deviceId;
      student.deviceModel = deviceModel;
      await student.save();
      return res.json({ success: true, message: 'Device successfully bound to Student!' });
    }

    if (student.deviceId !== deviceId) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ This Roll Number is already registered on another device! Contact administrator.' 
      });
    }

    res.json({ success: true, message: 'Device verified.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Step 4.2: The Mobile Attendance Scan Endpoint
*   **Goal**: Create the endpoint that the Flutter app calls after scanning a QR code.
*   **Reason**: The Flutter app will fetch the token from the QR code, read the device's hardware UUID locally, and send them both to the server.
*   **Where to Write**: Create `backend/routes/attendanceRoutes.js` and add a `/api/attendance/submit` POST route.
*   **Action Items**:
    1. Verify the scanned QR token is currently active and has not expired.
    2. Retrieve the student from the database using their JWT or session token.
    3. Verify that the incoming `deviceId` matches the bound `deviceId` in the student model.
    4. Create an entry in the `AttendanceSchema` representing the student as "Present".

```javascript
// backend/controllers/attendanceController.js - Skeleton
const Session = require('../models/Session');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

const submitMobileAttendance = async (req, res) => {
  const { token, deviceId, rollNumber } = req.body;
  try {
    // 1. Verify the QR Code token is valid
    const session = await Session.findOne({ currentToken: token, isActive: true });
    if (!session) {
      return res.status(400).json({ success: false, message: '❌ Invalid or expired QR token!' });
    }

    // 2. Retrieve Student and verify device binding
    const student = await Student.findOne({ rollNumber });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (student.deviceId !== deviceId) {
      return res.status(403).json({ 
        success: false, 
        message: '❌ Fraud detected: Device ID does not match registered device!' 
      });
    }

    // 3. Mark Attendance (upsert/ensure no duplicates)
    const attendance = await Attendance.findOneAndUpdate(
      { sessionId: session._id, studentId: student._id },
      { rollNumber, timestamp: new Date(), status: 'Present', verificationMethod: 'QR_App' },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: '✅ Attendance recorded successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

## Phase 5: Real-Time Updates & Frontend Dashboard (React)

### Step 5.1: Initialize React Application
*   **Goal**: Create a modern React application.
*   **Reason**: Building the frontend with vanilla HTML/JS and jQuery gets chaotic. React offers component-based architecture and declarative rendering.
*   **What to Learn / Research**:
    *   *Search query*: "Vite React template initialization"
*   **Action Items**:
    1. Navigate to the root directory `rtp_project`.
    2. Run: `npx -y create-vite@latest frontend --template react` (This builds a Vite React structure).
    3. Run `npm install` inside `frontend/` directory.

### Step 5.2: Set Up Real-Time Event Communication (Socket.io)
*   **Goal**: Update the lecturer dashboard instantly when a student scans their QR code.
*   **Reason**: In the prototype, the client polls the server every 10 seconds. Polling wastes database resources and causes sluggish dashboard updates. WebSockets provide persistent open channels for instant server push.
*   **What to Learn / Research**:
    *   *Concepts*: TCP socket connection vs HTTP requests, publish-subscribe model, event emitters.
    *   *Search query*: "Socket.io React integration tutorial".
*   **Where to Write**:
    *   Server: `backend/server.js` (initialize `socket.io` wrapping the HTTP server).
    *   Client: `frontend/src/components/Dashboard.jsx` (connect using `socket.io-client`).
*   **Action Items**:
    1. When a student marks attendance via `/api/attendance/submit`, emit a custom event: `io.emit('attendanceUpdate', { rollNumber })`.
    2. On the React dashboard, listen for `'attendanceUpdate'` and update the UI array in real-time.

---

## Roadmap Checkpoints

As you build this system, check off these items to verify your progress:

*   [ ] All git conflict markers are removed from HTML files.
*   [ ] Server runs inside `backend/` and successfully prints "MongoDB Connected".
*   [ ] Database holds `User`, `Student`, `Session`, and `Attendance` collections.
*   [ ] Lecturer login successfully encrypts passwords via `bcryptjs` and returns a valid JWT.
*   [ ] `/api/student/register-device` locks a student profile to a specific device identifier.
*   [ ] React client connects to Node server using WebSockets (`socket.io`).
*   [ ] Flutter stubs return proper responses depending on whether the device ID matches the student record.
