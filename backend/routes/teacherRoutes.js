const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');

router.get('/classes', teacherController.getClasses);
router.post('/start-session', teacherController.startSession);
router.post('/close-session', teacherController.closeSession);

module.exports = router;