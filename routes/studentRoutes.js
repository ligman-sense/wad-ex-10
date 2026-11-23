const express = require('express');
const controller = require('../controllers/studentController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.get('/', controller.home);
router.get('/students', controller.viewStudents);
router.get('/students/add', controller.addStudentForm);
router.post('/students/add', controller.addStudent);
router.get('/students/edit/:rollno', requireAdmin, controller.editStudentForm);
router.post('/students/update/:rollno', requireAdmin, controller.updateStudent);
router.post('/students/delete', requireAdmin, controller.deleteStudent);
router.get('/login', controller.loginForm);
router.post('/login', controller.login);
router.post('/logout', controller.logout);

module.exports = router;

