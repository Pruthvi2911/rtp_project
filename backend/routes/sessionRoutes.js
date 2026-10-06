const express = require('express');
const { createSession, getActiveSession, endSession } = require('../controllers/sessionController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(protect); // Secure all session routes

router.post('/', createSession);
router.get('/active', getActiveSession);
router.put('/:id/end', endSession);

module.exports = router;
