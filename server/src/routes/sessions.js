const router = require('express').Router();
const { ClassSession, Package } = require('../models');
const { protect, tutorOnly } = require('../middleware/auth');
const { ah, notify, checkLowBalance, generateSessions } = require('../utils/helpers');

router.use(protect);

const fmt = (d) => new Date(d).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

// List sessions. Students only ever see their own.
router.get('/', ah(async (req, res) => {
  const { from, to, student, status, limit } = req.query;
  const filter = {};
  if (req.user.role === 'student') filter.student = req.user._id;
  else if (student) filter.student = student;
  if (status) filter.status = { $in: status.split(',') };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  let q = ClassSession.find(filter).populate('student', 'name grade rollNo phone parentPhone').sort({ date: req.query.sort === 'desc' ? -1 : 1 });
  if (limit) q = q.limit(Number(limit));
  res.json(await q);
}));

// Schedule a one-off class
router.post('/', tutorOnly, ah(async (req, res) => {
  const { student, package: pkgId, subject, date, durationMins, topic } = req.body;
  if (!student || !date) return res.status(400).json({ message: 'Student and date/time are required' });
  let subj = subject;
  if (pkgId && !subj) subj = (await Package.findById(pkgId))?.subject;
  const s = await ClassSession.create({ student, package: pkgId || undefined, subject: subj || 'General', date, durationMins: durationMins || 60, topic });
  await notify([student], { type: 'class', title: 'New class scheduled', message: `${s.subject} on ${fmt(s.date)}`, link: '/student/classes' });
  res.status(201).json(await s.populate('student', 'name grade rollNo'));
}));

// Core action: mark completed (deducts one class from the package)
router.patch('/:id/complete', tutorOnly, ah(async (req, res) => {
  const s = await ClassSession.findById(req.params.id);
  if (!s) return res.status(404).json({ message: 'Class not found' });
  s.status = 'completed';
  s.markedAt = new Date();
  if (req.body.topic !== undefined) s.topic = req.body.topic;
  if (req.body.notes !== undefined) s.notes = req.body.notes;
  await s.save();
  await checkLowBalance(s.package);
  res.json(await s.populate('student', 'name grade rollNo'));
}));

// Generic status change used by attendance + reschedule/cancel
async function applyStatus(s, { status, topic, notes, newDate }) {
  const allowed = ['scheduled', 'completed', 'absent', 'cancelled', 'rescheduled'];
  if (!allowed.includes(status)) throw Object.assign(new Error('Invalid status'), { status: 400 });
  const before = s.status;
  s.status = status;
  s.markedAt = new Date();
  if (topic !== undefined) s.topic = topic;
  if (notes !== undefined) s.notes = notes;

  if (status === 'rescheduled' && newDate) {
    const moved = await ClassSession.create({
      student: s.student, package: s.package, subject: s.subject, date: newDate,
      durationMins: s.durationMins, topic: s.topic, rescheduledFrom: s._id,
    });
    s.rescheduledTo = moved._id;
    await notify([s.student], { type: 'schedule', title: 'Class rescheduled', message: `${s.subject} on ${fmt(s.date)} moved to ${fmt(newDate)}.`, link: '/student/classes' });
  } else if (status === 'cancelled' && before !== 'cancelled') {
    await notify([s.student], { type: 'schedule', title: 'Class cancelled', message: `${s.subject} on ${fmt(s.date)} has been cancelled.`, link: '/student/classes' });
  }
  await s.save();
  if (status === 'completed' && before !== 'completed') await checkLowBalance(s.package);
  // Missed/cancelled class without a new date -> add a makeup class at the end of the package
  if (['absent', 'cancelled', 'rescheduled'].includes(status) && !newDate && s.package) {
    const pkg = await Package.findById(s.package);
    if (pkg && pkg.status === 'active') await generateSessions(pkg);
  }
  return s;
}

router.patch('/:id/status', tutorOnly, ah(async (req, res) => {
  const s = await ClassSession.findById(req.params.id);
  if (!s) return res.status(404).json({ message: 'Class not found' });
  await applyStatus(s, req.body);
  res.json(await s.populate('student', 'name grade rollNo'));
}));

// Bulk attendance: [{ id, status }]. Present = completed (deducts a class).
router.post('/attendance', tutorOnly, ah(async (req, res) => {
  const map = { present: 'completed', absent: 'absent', cancelled: 'cancelled', rescheduled: 'rescheduled', scheduled: 'scheduled' };
  const items = req.body.items || [];
  for (const it of items) {
    const s = await ClassSession.findById(it.id);
    if (!s) continue;
    const status = map[it.status] || it.status;
    if (s.status !== status) await applyStatus(s, { status, newDate: it.newDate, topic: it.topic });
  }
  res.json({ message: `Attendance saved for ${items.length} class(es)` });
}));

router.put('/:id', tutorOnly, ah(async (req, res) => {
  const s = await ClassSession.findById(req.params.id);
  if (!s) return res.status(404).json({ message: 'Class not found' });
  const oldDate = s.date;
  ['date', 'durationMins', 'topic', 'notes', 'subject'].forEach((k) => { if (req.body[k] !== undefined) s[k] = req.body[k]; });
  await s.save();
  if (req.body.date && new Date(req.body.date).getTime() !== oldDate.getTime()) {
    await notify([s.student], { type: 'schedule', title: 'Class time changed', message: `${s.subject} is now on ${fmt(s.date)}.`, link: '/student/classes' });
  }
  res.json(await s.populate('student', 'name grade rollNo'));
}));

router.delete('/:id', tutorOnly, ah(async (req, res) => {
  await ClassSession.deleteOne({ _id: req.params.id });
  res.json({ message: 'Class removed' });
}));

module.exports = router;
