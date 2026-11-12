const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

router.post('/signup', studentController.signup);
router.post('/login', studentController.login);
router.post('/submit-attendance', studentController.submitAttendance);
router.get('/attendance/:studentCode', studentController.getAttendanceHistory);
router.get('/schedule', studentController.getSchedule);

module.exports = router;