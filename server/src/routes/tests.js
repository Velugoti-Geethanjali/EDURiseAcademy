const router = require('express').Router();
const { Test, Result } = require('../models');
const User = require('../models/User');
const { protect, tutorOnly } = require('../middleware/auth');
const { ah, notify, upload, fileInfo } = require('../utils/helpers');

router.use(protect);

router.get('/', ah(async (req, res) => {
  if (req.user.role === 'student') {
    const tests = await Test.find({ $or: [{ assignedTo: { $size: 0 } }, { assignedTo: req.user._id }] }).sort({ date: 1 });
    const results = await Result.find({ student: req.user._id, test: { $in: tests.map((t) => t._id) } });
    return res.json(tests.map((t) => ({ ...t.toObject(), result: results.find((r) => String(r.test) === String(t._id)) || null })));
  }
  const tests = await Test.find().sort({ date: -1 });
  const results = await Result.find({ test: { $in: tests.map((t) => t._id) } });
  res.json(tests.map((t) => {
    const rs = results.filter((r) => String(r.test) === String(t._id) && r.marks !== undefined && r.marks !== null);
    const avg = rs.length ? rs.reduce((a, r) => a + r.marks, 0) / rs.length : null;
    return { ...t.toObject(), resultCount: rs.length, average: avg, averagePct: avg !== null ? Math.round((avg / t.maxMarks) * 100) : null };
  }));
}));

router.post('/', tutorOnly, ah(async (req, res) => {
  const { name, subject, date, maxMarks, syllabus, assignedTo = [] } = req.body;
  if (!name || !maxMarks) return res.status(400).json({ message: 'Test name and max marks are required' });
  const t = await Test.create({ name, subject, date, maxMarks, syllabus, assignedTo });
  await notify(assignedTo.length ? assignedTo : 'all', {
    type: 'test', title: 'Test scheduled', message: `${name}${subject ? ` (${subject})` : ''}${date ? ` on ${new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}`, link: '/student/results',
  });
  res.status(201).json(t);
}));

router.put('/:id', tutorOnly, ah(async (req, res) => {
  const t = await Test.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(t);
}));

router.delete('/:id', tutorOnly, ah(async (req, res) => {
  await Result.deleteMany({ test: req.params.id });
  await Test.deleteOne({ _id: req.params.id });
  res.json({ message: 'Deleted' });
}));

// Roster with marks for one test
router.get('/:id/results', tutorOnly, ah(async (req, res) => {
  const test = await Test.findById(req.params.id);
  if (!test) return res.status(404).json({ message: 'Not found' });
  const students = test.assignedTo.length
    ? await User.find({ _id: { $in: test.assignedTo } }).select('name grade rollNo').sort({ name: 1 })
    : await User.find({ role: 'student', status: 'active' }).select('name grade rollNo').sort({ name: 1 });
  const results = await Result.find({ test: test._id });
  res.json({
    test,
    rows: students.map((s) => ({ student: s, result: results.find((r) => String(r.student) === String(s._id)) || null })),
  });
}));

// Save marks in bulk: [{ student, marks, feedback }]
router.put('/:id/results', tutorOnly, ah(async (req, res) => {
  const test = await Test.findById(req.params.id);
  if (!test) return res.status(404).json({ message: 'Not found' });
  const rows = req.body.rows || [];
  for (const r of rows) {
    if (r.marks === '' || r.marks === undefined || r.marks === null) continue;
    const existing = await Result.findOne({ test: test._id, student: r.student });
    const isNew = !existing || existing.marks === undefined;
    await Result.findOneAndUpdate(
      { test: test._id, student: r.student },
      { marks: Number(r.marks), feedback: r.feedback },
      { upsert: true, new: true }
    );
    if (isNew) await notify([r.student], { type: 'test', title: 'Result published', message: `${test.name}: ${r.marks}/${test.maxMarks}`, link: '/student/results' });
  }
  res.json({ message: 'Marks saved' });
}));

router.post('/:id/results/:studentId/sheet', tutorOnly, upload.single('file'), ah(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a file' });
  const r = await Result.findOneAndUpdate(
    { test: req.params.id, student: req.params.studentId },
    { answerSheet: fileInfo(req.file) },
    { upsert: true, new: true }
  );
  res.json(r);
}));

module.exports = router;
