const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');

router.post('/signup', teacherController.signup);
router.post('/login', teacherController.login);
router.get('/profile/:teacherId', teacherController.getProfile);
router.put('/profile/:teacherId', teacherController.updateProfile);
router.get('/classes', teacherController.getClasses);
router.post('/courses', teacherController.createCourse);
router.delete('/courses/:class_id', teacherController.deleteCourse);
router.get('/classes/:classId/students', teacherController.getClassStudents);
router.post('/classes/:classId/students', teacherController.addStudentToClass);
router.post('/classes/:classId/students/register', teacherController.registerStudentToClass);
router.delete('/classes/:classId/students/:studentId', teacherController.removeStudentFromClass);
router.get('/classes/:classId/monthly-attendance', teacherController.getMonthlyAttendance);
router.post('/start-session', teacherController.startSession);
router.post('/close-session', teacherController.closeSession);

module.exports = router;