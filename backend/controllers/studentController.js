const Student = require('../models/Student');

const registerDevice = async (req, res) => {
  const { rollNumber, name, email, deviceId, deviceModel } = req.body;

  if (!rollNumber || !deviceId) {
    return res.status(400).json({ success: false, message: 'Roll number and deviceId are required.' });
  }

  try {
    let student = await Student.findOne({ rollNumber: rollNumber.toUpperCase() });
    
    // If student record does not exist, create it (or handle as unregistered)
    if (!student) {
      student = await Student.create({
        rollNumber: rollNumber.toUpperCase(),
        name: name || `Student ${rollNumber}`,
        email: email || `${rollNumber.toLowerCase()}@mgit.edu.in`
      });
    }

    // Bind device ID if not already bound
    if (!student.deviceId) {
      student.deviceId = deviceId;
      student.deviceModel = deviceModel || 'Unknown Device';
      await student.save();
      return res.json({ 
        success: true, 
        message: '✅ Device bound successfully!', 
        student: { rollNumber: student.rollNumber, name: student.name } 
      });
    }

    // Check device match if already bound
    if (student.deviceId !== deviceId) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ Error: This roll number is already registered to another physical device!' 
      });
    }

    res.json({ success: true, message: '✅ Device verified.', student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { registerDevice };
