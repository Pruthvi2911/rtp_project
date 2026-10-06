const express = require('express');
const { registerDevice } = require('../controllers/studentController');
const router = express.Router();

// Device enrollment route (called by Flutter client on first login)
router.post('/register-device', registerDevice);

module.exports = router;
