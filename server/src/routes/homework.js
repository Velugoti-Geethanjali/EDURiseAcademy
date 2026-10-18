const router = require('express').Router();
const { Homework, Submission, Material } = require('../models');
const User = require('../models/User');
const { protect, tutorOnly } = require('../middleware/auth');
const { ah, notify, notifyTutor, upload, fileInfo } = require('../utils/helpers');

router.use(protect);

const forStudent = (id) => ({ $or: [{ assignedTo: { $size: 0 } }, { assignedTo: id }] });
const parseIds = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  try { const a = JSON.parse(v); return Array.isArray(a) ? a : [v]; } catch { return String(v).split(',').filter(Boolean); }
};

// ================= Homework =================
router.get('/', ah(async (req, res) => {
  if (req.user.role === 'student') {
    const list = await Homework.find(forStudent(req.user._id)).sort({ deadline: 1 });
    const subs = await Submission.find({ student: req.user._id, homework: { $in: list.map((h) => h._id) } });
    return res.json(list.map((h) => ({ ...h.toObject(), submission: subs.find((s) => String(s.homework) === String(h._id)) || null })));
  }
  const list = await Homework.find().populate('assignedTo', 'name').sort({ createdAt: -1 });
  const subs = await Submission.find({ homework: { $in: list.map((h) => h._id) } });
  const activeCount = await User.countDocuments({ role: 'student', status: 'active' });
  res.json(list.map((h) => {
    const mine = subs.filter((s) => String(s.homework) === String(h._id));
    return {
      ...h.toObject(),
      submittedCount: mine.length,
      reviewedCount: mine.filter((s) => s.reviewedAt).length,
      targetCount: h.assignedTo.length || activeCount,
    };
  }));
}));

router.post('/', tutorOnly, upload.array('files', 10), ah(async (req, res) => {
  const { title, description, subject, deadline, maxMarks } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });
  const assignedTo = parseIds(req.body.assignedTo);
  const hw = await Homework.create({
    title, description, subject, deadline: deadline || undefined, maxMarks: maxMarks || 10, assignedTo,
    attachments: (req.files || []).map(fileInfo),
  });
  await notify(assignedTo.length ? assignedTo : 'all', {
    type: 'homework', title: 'New homework', message: `${subject ? `${subject}: ` : ''}${title}${deadline ? ` – due ${new Date(deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}`, link: '/student/homework',
  });
  res.status(201).json(hw);
}));

router.put('/:id', tutorOnly, upload.array('files', 10), ah(async (req, res) => {
  const hw = await Homework.findById(req.params.id);
  if (!hw) return res.status(404).json({ message: 'Not found' });
  ['title', 'description', 'subject', 'deadline', 'maxMarks'].forEach((k) => { if (req.body[k] !== undefined) hw[k] = req.body[k] || undefined; });
  if (req.body.assignedTo !== undefined) hw.assignedTo = parseIds(req.body.assignedTo);
  if (req.files?.length) hw.attachments.push(...req.files.map(fileInfo));
  await hw.save();
  res.json(hw);
}));

router.delete('/:id', tutorOnly, ah(async (req, res) => {
  await Submission.deleteMany({ homework: req.params.id });
  await Homework.deleteOne({ _id: req.params.id });
  res.json({ message: 'Deleted' });
}));

router.get('/:id/submissions', tutorOnly, ah(async (req, res) => {
  const hw = await Homework.findById(req.params.id);
  if (!hw) return res.status(404).json({ message: 'Not found' });
  const subs = await Submission.find({ homework: hw._id }).populate('student', 'name grade rollNo').sort({ submittedAt: -1 });
  const targets = hw.assignedTo.length
    ? await User.find({ _id: { $in: hw.assignedTo } }).select('name grade rollNo')
    : await User.find({ role: 'student', status: 'active' }).select('name grade rollNo');
  const notSubmitted = targets.filter((t) => !subs.some((s) => String(s.student?._id) === String(t._id)));
  res.json({ homework: hw, submissions: subs, notSubmitted });
}));

// Student submits (or re-submits before review)
router.post('/:id/submit', upload.array('files', 5), ah(async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Only students submit homework' });
  const hw = await Homework.findById(req.params.id);
  if (!hw) return res.status(404).json({ message: 'Homework not found' });
  let sub = await Submission.findOne({ homework: hw._id, student: req.user._id });
  if (sub?.reviewedAt) return res.status(400).json({ message: 'Already reviewed by tutor' });
  if (!sub) sub = new Submission({ homework: hw._id, student: req.user._id });
  sub.text = req.body.text;
  if (req.files?.length) sub.files = req.files.map(fileInfo);
  sub.submittedAt = new Date();
  await sub.save();
  await notifyTutor({ type: 'homework', title: 'Homework submitted', message: `${req.user.name} submitted "${hw.title}"`, link: '/tutor/assignments' });
  res.json(sub);
}));

router.patch('/submissions/:id/review', tutorOnly, ah(async (req, res) => {
  const sub = await Submission.findById(req.params.id).populate('homework', 'title');
  if (!sub) return res.status(404).json({ message: 'Not found' });
  sub.marks = req.body.marks;
  sub.comment = req.body.comment;
  sub.reviewedAt = new Date();
  await sub.save();
  await notify([sub.student], { type: 'homework', title: 'Homework reviewed', message: `"${sub.homework?.title}" marked: ${sub.marks ?? '-'}`, link: '/student/homework' });
  res.json(await sub.populate('student', 'name grade rollNo'));
}));

// ================= Study materials =================
router.get('/materials/all', ah(async (req, res) => {
  const filter = req.user.role === 'student' ? forStudent(req.user._id) : {};
  res.json(await Material.find(filter).sort({ createdAt: -1 }));
}));

router.post('/materials', tutorOnly, upload.single('file'), ah(async (req, res) => {
  const { title, subject, description, link } = req.body;
  if (!title || (!req.file && !link)) return res.status(400).json({ message: 'Title and a file or link are required' });
  const assignedTo = parseIds(req.body.assignedTo);
  const m = await Material.create({ title, subject, description, link, assignedTo, file: fileInfo(req.file) });
  await notify(assignedTo.length ? assignedTo : 'all', { type: 'general', title: 'New study material', message: `${subject ? `${subject}: ` : ''}${title}`, link: '/student/materials' });
  res.status(201).json(m);
}));

router.delete('/materials/:id', tutorOnly, ah(async (req, res) => {
  await Material.deleteOne({ _id: req.params.id });
  res.json({ message: 'Deleted' });
}));

module.exports = router;
