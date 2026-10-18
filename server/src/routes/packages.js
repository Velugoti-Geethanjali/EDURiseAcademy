const router = require('express').Router();
const { Package, ClassSession, Payment } = require('../models');
const User = require('../models/User');
const { protect, tutorOnly } = require('../middleware/auth');
const { ah, withStats, generateSessions, notify } = require('../utils/helpers');

router.use(protect);

// Student: my packages
router.get('/mine', ah(async (req, res) => {
  const pkgs = await Package.find({ student: req.user._id }).sort({ createdAt: -1 });
  res.json(await Promise.all(pkgs.map(withStats)));
}));

router.get('/', tutorOnly, ah(async (req, res) => {
  const filter = {};
  if (req.query.student) filter.student = req.query.student;
  if (req.query.status) filter.status = req.query.status;
  const pkgs = await Package.find(filter).populate('student', 'name grade rollNo phone parentPhone').sort({ createdAt: -1 });
  res.json(await Promise.all(pkgs.map(withStats)));
}));

router.get('/:id', ah(async (req, res) => {
  const pkg = await Package.findById(req.params.id).populate('student', 'name grade rollNo phone parentName parentPhone');
  if (!pkg) return res.status(404).json({ message: 'Package not found' });
  if (req.user.role !== 'tutor' && String(pkg.student._id) !== String(req.user._id)) return res.status(403).json({ message: 'Not allowed' });
  const sessions = await ClassSession.find({ package: pkg._id }).sort({ date: 1 });
  res.json({ ...(await withStats(pkg)), sessions });
}));

// Create package -> auto-create weekly sessions -> optional fee entry
router.post('/', tutorOnly, ah(async (req, res) => {
  const b = req.body;
  const student = await User.findOne({ _id: b.student, role: 'student' });
  if (!student) return res.status(400).json({ message: 'Select a valid student' });
  if (!b.subject || !b.totalClasses || !b.startDate) return res.status(400).json({ message: 'Subject, total classes and start date are required' });
  const pkg = await Package.create({
    student: student._id, subject: b.subject, title: b.title || `${b.totalClasses}-Class ${b.subject} Pack`,
    totalClasses: Number(b.totalClasses), startDate: b.startDate, expiryDate: b.expiryDate || undefined,
    feeType: b.feeType || 'package', feeAmount: Number(b.feeAmount) || 0,
    schedule: (b.schedule || []).filter((s) => s.time !== undefined && s.day !== undefined && s.day !== ''),
    durationMins: Number(b.durationMins) || 60,
  });
  if (!student.subjects.includes(b.subject)) { student.subjects.push(b.subject); await student.save(); }
  const created = await generateSessions(pkg);
  if (b.createFee && pkg.feeAmount > 0) {
    await Payment.create({
      student: student._id, package: pkg._id, amount: pkg.feeAmount,
      description: pkg.feeType === 'monthly' ? `${b.subject} monthly fee` : `${pkg.title} fee`,
      dueDate: b.feeDueDate || pkg.startDate,
    });
  }
  await notify([student._id], { type: 'schedule', title: 'New class package', message: `${pkg.title} has been added with ${created} classes scheduled.`, link: '/student/classes' });
  res.status(201).json({ ...(await withStats(pkg)), sessionsCreated: created });
}));

router.put('/:id', tutorOnly, ah(async (req, res) => {
  const pkg = await Package.findById(req.params.id);
  if (!pkg) return res.status(404).json({ message: 'Package not found' });
  ['subject', 'title', 'totalClasses', 'startDate', 'expiryDate', 'feeType', 'feeAmount', 'schedule', 'durationMins', 'status']
    .forEach((k) => { if (req.body[k] !== undefined) pkg[k] = req.body[k] === '' ? undefined : req.body[k]; });
  await pkg.save();
  let created = 0;
  if (req.body.regenerate) {
    // Remove future, untouched sessions and rebuild from the new timetable
    await ClassSession.deleteMany({ package: pkg._id, status: 'scheduled', date: { $gte: new Date() } });
    created = await generateSessions(pkg);
  }
  res.json({ ...(await withStats(pkg)), sessionsCreated: created });
}));

// Fill up remaining sessions (e.g. after cancellations)
router.post('/:id/generate', tutorOnly, ah(async (req, res) => {
  const pkg = await Package.findById(req.params.id);
  if (!pkg) return res.status(404).json({ message: 'Package not found' });
  const created = await generateSessions(pkg);
  res.json({ ...(await withStats(pkg)), sessionsCreated: created });
}));

router.delete('/:id', tutorOnly, ah(async (req, res) => {
  await ClassSession.deleteMany({ package: req.params.id });
  await Package.deleteOne({ _id: req.params.id });
  res.json({ message: 'Package deleted' });
}));

module.exports = router;
