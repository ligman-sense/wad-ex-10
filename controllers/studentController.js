const bcrypt = require('bcryptjs');
const Student = require('../models/Student');

const allowedSortFields = ['rollno', 'name', 'yearOfBirth', 'yearOfAdmission', 'nativeCity', 'phoneNumber'];
function valuesFrom(body) {
  return {
    rollno: body.rollno,
    name: typeof body.name === 'string' ? body.name.trim() : '',
    yearOfBirth: body.yearOfBirth,
    yearOfAdmission: body.yearOfAdmission,
    nativeCity: typeof body.nativeCity === 'string' ? body.nativeCity.trim() : '',
    phoneNumber: typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : '',
    guardianPhoneNumber: typeof body.guardianPhoneNumber === 'string' ? (body.guardianPhoneNumber.trim() || undefined) : undefined,
    gender: body.gender
  };
}

function getErrorMessage(err) {
  if (err.code === 11000) return 'Roll number already exists.';
  if (err.name === 'ValidationError') return Object.values(err.errors).map(item => item.message).join(' ');
  return 'The request could not be completed. Check the entered values and try again.';
}

async function renderStudents(req, res) {
  const filters = {
    name: String(req.query.name || '').trim(),
    yearOfAdmission: String(req.query.yearOfAdmission || '').trim(),
    nativeCity: String(req.query.nativeCity || '').trim(),
    birthAfter: String(req.query.birthAfter || '').trim(),
    guardianMissing: req.query.guardianMissing === '1',
    sort: allowedSortFields.includes(req.query.sort) ? req.query.sort : (req.query.sort === 'admission-desc' ? 'yearOfAdmission' : 'rollno'),
    order: req.query.sort === 'admission-desc' ? 'desc' : (req.query.order === 'desc' ? 'desc' : 'asc')
  };
  const query = {};
  if (filters.name) query.name = { $regex: filters.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (/^\d{4}$/.test(filters.yearOfAdmission)) query.yearOfAdmission = Number(filters.yearOfAdmission);
  if (filters.nativeCity) query.nativeCity = { $regex: `^${filters.nativeCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
  if (/^\d{4}$/.test(filters.birthAfter)) query.yearOfBirth = { $gt: Number(filters.birthAfter) };
  if (filters.guardianMissing) query.$or = [{ guardianPhoneNumber: { $exists: false } }, { guardianPhoneNumber: { $in: ['', null] } }];

  const sortOrder = filters.order === 'desc' ? -1 : 1;
  const [students, totalStudents] = await Promise.all([
    Student.find(query).sort({ [filters.sort]: sortOrder, rollno: 1 }).lean(),
    Student.countDocuments()
  ]);
  res.render('students/index', { students, filters, totalStudents });
}

exports.home = async (req, res, next) => { try { await renderStudents(req, res); } catch (err) { next(err); } };
exports.viewStudents = async (req, res, next) => { try { await renderStudents(req, res); } catch (err) { next(err); } };
exports.addStudentForm = (req, res) => res.render('students/form', { student: {}, editing: false });
exports.addStudent = async (req, res) => {
  const student = valuesFrom(req.body);
  try {
    await Student.create(student);
    res.redirect('/students?notice=Student%20added%20successfully.');
  } catch (err) {
    res.status(400).render('students/form', { student, editing: false, formError: getErrorMessage(err) });
  }
};

exports.editStudentForm = async (req, res, next) => {
  try {
    const student = await Student.findOne({ rollno: Number(req.params.rollno) }).lean();
    if (!student) return res.status(404).render('error', { message: 'Student not found.' });
    res.render('students/form', { student, editing: true });
  } catch (err) { next(err); }
};
exports.updateStudent = async (req, res) => {
  const values = valuesFrom(req.body);
  try {
    const student = await Student.findOne({ rollno: Number(req.params.rollno) });
    if (!student) return res.status(404).render('error', { message: 'Student not found.' });
    student.name = values.name;
    student.yearOfBirth = values.yearOfBirth;
    student.yearOfAdmission = values.yearOfAdmission;
    student.nativeCity = values.nativeCity;
    student.phoneNumber = values.phoneNumber;
    student.guardianPhoneNumber = values.guardianPhoneNumber;
    student.gender = values.gender;
    await student.save();
    res.redirect('/students?notice=Student%20updated%20successfully.');
  } catch (err) {
    res.status(400).render('students/form', { student: { ...values, rollno: Number(req.params.rollno) }, editing: true, formError: getErrorMessage(err) });
  }
};
exports.deleteStudent = async (req, res, next) => {
  try {
    const result = await Student.deleteOne({ rollno: Number(req.body.rollno) });
    const notice = result.deletedCount ? 'Student%20deleted%20successfully.' : 'Student%20not%20found.';
    res.redirect(`/students?notice=${notice}`);
  } catch (err) { next(err); }
};

exports.loginForm = (req, res) => res.render('login');
exports.login = async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const passwordMatches = process.env.ADMIN_PASSWORD_HASH
    ? await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)
    : process.env.NODE_ENV !== 'production' && password === process.env.ADMIN_PASSWORD;
  if (username !== process.env.ADMIN_USERNAME || !passwordMatches) {
    return res.status(401).render('login', { formError: 'Username or password is incorrect.' });
  }
  req.session.regenerate(err => {
    if (err) return res.status(500).render('login', { formError: 'Could not start a secure session. Please try again.' });
    req.session.isAdmin = true;
    req.session.username = username;
    return res.redirect('/students?notice=Signed%20in%20as%20administrator.');
  });
};
exports.logout = (req, res) => req.session.destroy(() => res.redirect('/students?notice=Signed%20out.'));

