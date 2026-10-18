const router = require('express').Router();
const User = require('../models/User');
const { Package, ClassSession, Payment, Submission, Result, Notification } = require('../models');
const { protect, tutorOnly } = require('../middleware/auth');
const { ah, notify, withStats, nextRollNo } = require('../utils/helpers');

router.use(protect, tutorOnly);

// List students with package progress + fee status
router.get('/', ah(async (req, res) => {
  const { status = 'active', q } = req.query;
  const filter = { role: 'student' };
  if (status !== 'all') filter.status = status;
  let students = await User.find(filter).sort({ name: 1 });
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    students = students.filter((s) => rx.test(s.name) || rx.test(s.phone || '') || rx.test(s.rollNo || '') || rx.test(s.email || ''));
  }
  const ids = students.map((s) => s._id);
  const [packages, pending] = await Promise.all([
    Package.find({ student: { $in: ids }, status: 'active' }),
    Payment.find({ student: { $in: ids }, status: 'pending' }),
  ]);
  const out = await Promise.all(students.map(async (s) => {
    const pk = await Promise.all(packages.filter((p) => String(p.student) === String(s._id)).map(withStats));
    const dues = pending.filter((p) => String(p.student) === String(s._id));
    return { ...s.toJSON(), packages: pk, pendingFees: dues.reduce((a, p) => a + p.amount, 0) };
  }));
  res.json(out);
}));

// Tutor adds a student directly (active immediately)
router.post('/', ah(async (req, res) => {
  const b = req.body;
  if (!b.name || (!b.phone && !b.email)) return res.status(400).json({ message: 'Name and phone or email are required' });
  const or = [];
  if (b.email) or.push({ email: b.email.toLowerCase() });
  if (b.phone) or.push({ phone: b.phone });
  if (await User.findOne({ $or: or })) return res.status(400).json({ message: 'This phone or email is already registered' });
  const student = await User.create({
    role: 'student', status: 'active', name: b.name, email: b.email || undefined, phone: b.phone || undefined,
    password: b.password || b.phone || 'student123', grade: b.grade, board: b.board, subjects: b.subjects || [],
    parentName: b.parentName, parentPhone: b.parentPhone, address: b.address, notes: b.notes,
    rollNo: b.rollNo || (await nextRollNo()), joinedOn: b.joinedOn || new Date(),
  });
  res.status(201).json(student);
}));

router.get('/:id', ah(async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: 'student' });
  if (!student) return res.status(404).json({ message: 'Student not found' });
  const [packages, sessions, payments, submissions, results] = await Promise.all([
    Package.find({ student: student._id }).sort({ createdAt: -1 }),
    ClassSession.find({ student: student._id }).sort({ date: -1 }),
    Payment.find({ student: student._id }).sort({ createdAt: -1 }),
    Submission.find({ student: student._id }).populate('homework', 'title subject deadline maxMarks').sort({ submittedAt: -1 }),
    Result.find({ student: student._id }).populate('test', 'name subject date maxMarks'),
  ]);
  res.json({
    student,
    packages: await Promise.all(packages.map(withStats)),
    sessions,
    payments,
    submissions,
    results: results.filter((r) => r.test).sort((a, b) => new Date(a.test.date) - new Date(b.test.date)),
  });
}));

router.put('/:id', ah(async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: 'student' });
  if (!student) return res.status(404).json({ message: 'Student not found' });
  ['name', 'email', 'phone', 'grade', 'board', 'subjects', 'parentName', 'parentPhone', 'address', 'notes', 'rollNo', 'status']
    .forEach((k) => { if (req.body[k] !== undefined) student[k] = req.body[k] === '' ? undefined : req.body[k]; });
  if (req.body.password) student.password = req.body.password;
  await student.save();
  res.json(student);
}));

// Delete a student and all their records
router.delete('/:id', ah(async (req, res) => {
  const id = req.params.id;
  await Promise.all([
    Package.deleteMany({ student: id }), ClassSession.deleteMany({ student: id }), Payment.deleteMany({ student: id }),
    Submission.deleteMany({ student: id }), Result.deleteMany({ student: id }), Notification.deleteMany({ user: id }),
  ]);
  await User.deleteOne({ _id: id, role: 'student' });
  res.json({ message: 'Student deleted' });
}));

module.exports = router;
