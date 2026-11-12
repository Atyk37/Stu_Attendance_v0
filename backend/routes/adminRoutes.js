const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../utils/adminSession');

router.post('/login', adminController.login);
router.use(requireAdmin);
router.get('/students', adminController.getStudents);
router.post('/students', adminController.createStudent);
router.patch('/students/:studentId', adminController.updateStudent);
router.delete('/students/:studentId', adminController.deleteStudent);

module.exports = router;
