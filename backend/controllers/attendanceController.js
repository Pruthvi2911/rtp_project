const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Session = require('../models/Session');
const fs = require('fs');
const path = require('path');

const submitMobileAttendance = async (req, res) => {
  const { token, deviceId, rollNumber } = req.body;

  if (!token || !deviceId || !rollNumber) {
    return res.status(400).json({ success: false, message: 'Missing token, deviceId, or rollNumber.' });
  }

  try {
    // 1. Verify session exists and is active with matching token
    const session = await Session.findOne({ currentToken: token, isActive: true });
    if (!session) {
      return res.status(400).json({ success: false, message: '❌ Invalid or expired QR Code!' });
    }

    // 2. Validate token expiry
    if (new Date() > session.tokenExpiresAt) {
      return res.status(400).json({ success: false, message: '❌ QR code has expired! Wait for refresh.' });
    }

    // 3. Find Student and verify device matching
    const student = await Student.findOne({ rollNumber: rollNumber.toUpperCase() });
    if (!student) {
      return res.status(404).json({ success: false, message: '❌ Student roll number not registered.' });
    }

    if (student.deviceId !== deviceId) {
      return res.status(403).json({ 
        success: false, 
        message: '❌ Security violation: This device does not match the registered device for this roll number!' 
      });
    }

    // 4. Record attendance (using upsert to prevent duplicates)
    const attendance = await Attendance.findOneAndUpdate(
      { sessionId: session._id, studentId: student._id },
      { rollNumber: student.rollNumber, timestamp: new Date(), status: 'Present', verificationMethod: 'QR_App' },
      { upsert: true, new: true }
    );

    // 5. Emit real-time Socket.io update to lecturer
    if (req.app.get('socketio')) {
      const io = req.app.get('socketio');
      io.emit('studentCheckedIn', {
        sessionId: session._id,
        rollNumber: student.rollNumber,
        name: student.name,
        timestamp: attendance.timestamp
      });
    }

    res.json({ success: true, message: '✅ Attendance marked successfully!', attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAttendanceList = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const records = await Attendance.find({ sessionId }).populate('studentId', 'name email deviceModel');
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const exportAttendance = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const students = await Student.find().sort({ rollNumber: 1 });
    const attendanceRecords = await Attendance.find({ sessionId });

    const attendanceMap = {};
    attendanceRecords.forEach(rec => {
      attendanceMap[rec.rollNumber] = rec.status;
    });

    const csvRows = ['Roll Number,Name,Status'];
    students.forEach(std => {
      const status = attendanceMap[std.rollNumber] || 'Absent';
      csvRows.push(`${std.rollNumber},${std.name},${status}`);
    });

    const csvData = csvRows.join('\n');
    const filename = `attendance_${session.className.replace(/\s+/g, '_')}_${session._id}.csv`;
    const tempFilePath = path.join(__dirname, '..', filename);

    fs.writeFileSync(tempFilePath, csvData);
    res.download(tempFilePath, filename, (err) => {
      if (err) console.error('Error downloading CSV:', err);
      // Clean up local file after sending
      try {
        fs.unlinkSync(tempFilePath);
      } catch (unlinkErr) {
        console.error('Error cleaning up temp file:', unlinkErr);
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitMobileAttendance, getAttendanceList, exportAttendance };
