const Session = require('../models/Session');
const crypto = require('crypto');

// Generate 6-character cryptographically secure token
const generateSecureToken = () => {
  return crypto.randomBytes(3).toString('hex');
};

const createSession = async (req, res) => {
  const { className } = req.body;
  try {
    // Deactivate any existing active sessions for this lecturer
    await Session.updateMany({ lecturerId: req.user.id, isActive: true }, { isActive: false });

    const session = await Session.create({
      lecturerId: req.user.id,
      className,
      currentToken: generateSecureToken(),
      tokenExpiresAt: new Date(Date.now() + 10000), // Expires in 10s
      isActive: true
    });

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getActiveSession = async (req, res) => {
  try {
    const session = await Session.findOne({ lecturerId: req.user.id, isActive: true });
    if (!session) {
      return res.status(404).json({ message: 'No active session found.' });
    }

    const now = new Date();
    if (now > session.tokenExpiresAt) {
      // Rotate token if expired
      session.currentToken = generateSecureToken();
      session.tokenExpiresAt = new Date(Date.now() + 10000);
      await session.save();

      // Broadcast new token event via WebSocket if socket server exists
      if (req.app.get('socketio')) {
        const io = req.app.get('socketio');
        io.emit('tokenUpdate', { sessionId: session._id, token: session.currentToken });
      }
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const endSession = async (req, res) => {
  const { id } = req.params;
  try {
    const session = await Session.findOneAndUpdate(
      { _id: id, lecturerId: req.user.id },
      { isActive: false },
      { new: true }
    );
    if (!session) {
      return res.status(404).json({ message: 'Session not found or unauthorized' });
    }
    res.json({ message: 'Session ended successfully.', session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createSession, getActiveSession, endSession };
