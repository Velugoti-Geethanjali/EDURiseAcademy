// Announcements, notifications, settings and dashboards
const router = require('express').Router();
const User = require('../models/User');
const { Announcement, Notification, Package, ClassSession, Payment, Submission, Homework, Test, Result } = require('../models');
const { protect, tutorOnly } = require('../middleware/auth');
const { ah, notify, getSettings, withStats } = require('../utils/helpers');

router.use(protect);

// ================= Announcements =================
router.get('/announcements', ah(async (req, res) => {
  const filter = req.user.role === 'student' ? { $or: [{ audience: { $size: 0 } }, { audience: req.user._id }] } : {};
  res.json(await Announcement.find(filter).populate('audience', 'name').sort({ pinned: -1, createdAt: -1 }));
}));

router.post('/announcements', tutorOnly, ah(async (req, res) => {
  const { title, body, category, audience = [], pinned } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });
  const a = await Announcement.create({ title, body, category, audience, pinned });
  await notify(audience.length ? audience : 'all', { type: 'announcement', title, message: (body || '').slice(0, 140), link: '/student' });
  res.status(201).json(a);
}));

router.put('/announcements/:id', tutorOnly, ah(async (req, res) => {
  res.json(await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));

router.delete('/announcements/:id', tutorOnly, ah(async (req, res) => {
  await Announcement.deleteOne({ _id: req.params.id });
  res.json({ message: 'Deleted' });
}));

// ================= Notifications =================
router.get('/notifications', ah(async (req, res) => {
  const list = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ items: list, unread: list.filter((n) => !n.read).length });
}));

router.patch('/notifications/read-all', ah(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
}));

router.patch('/notifications/:id/read', ah(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  res.json({ ok: true });
}));

// ================= Settings =================
router.put('/settings', tutorOnly, ah(async (req, res) => {
  const s = await getSettings();
  ['tuitionName', 'tagline', 'logoUrl', 'phone', 'whatsapp', 'email', 'address', 'subjects', 'grades', 'lowBalanceThreshold']
    .forEach((k) => { if (req.body[k] !== undefined) s[k] = req.body[k]; });
  await s.save();
  res.json(s);
}));

// ================= Dashboards =================
const dayBounds = (d = new Date()) => {
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end = new Date(d); end.setHours(23, 59, 59, 999);
  return { start, end };
};

router.get('/dashboard/tutor', tutorOnly, ah(async (req, res) => {
  const { start, end } = dayBounds();
  const weekEnd = new Date(end.getTime() + 7 * 864e5);
  const settings = await getSettings();
  const [totalStudents, today, upcoming, pendingPays, recentPays, activePkgs, homework] = await Promise.all([
    User.countDocuments({ role: 'student', status: 'active' }),
    ClassSession.find({ date: { $gte: start, $lte: end } }).populate('student', 'name grade rollNo').sort({ date: 1 }),
    ClassSession.find({ date: { $gt: end, $lte: weekEnd }, status: 'scheduled' }).populate('student', 'name grade').sort({ date: 1 }),
    Payment.find({ status: 'pending' }).populate('student', 'name grade'),
    Payment.find({ status: 'paid' }).populate('student', 'name grade').sort({ paidOn: -1 }).limit(6),
    Package.find({ status: 'active' }).populate('student', 'name grade phone parentPhone status'),
    Homework.find().select('_id'),
  ]);
  const pkgStats = await Promise.all(activePkgs.filter((p) => p.student?.status === 'active').map(withStats));
  const lowBalance = pkgStats.filter((p) => p.stats.remaining <= settings.lowBalanceThreshold).sort((a, b) => a.stats.remaining - b.stats.remaining);
  const unreviewed = await Submission.find({ homework: { $in: homework.map((h) => h._id) }, reviewedAt: { $exists: false } })
    .populate('student', 'name').populate('homework', 'title subject').sort({ submittedAt: -1 });

  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const monthPaid = await Payment.find({ status: 'paid', paidOn: { $gte: monthStart } });

  res.json({
    stats: {
      totalStudents,
      todayClasses: today.length,
      todayCompleted: today.filter((s) => s.status === 'completed').length,
      pendingFees: pendingPays.reduce((a, p) => a + p.amount, 0),
      pendingFeeCount: pendingPays.length,
      collectedThisMonth: monthPaid.reduce((a, p) => a + p.amount, 0),
      unreviewedHomework: unreviewed.length,
    },
    today, upcoming, lowBalance, recentPayments: recentPays,
    pendingPayments: pendingPays.slice(0, 6), unreviewed: unreviewed.slice(0, 6),
  });
}));

router.get('/dashboard/student', ah(async (req, res) => {
  const id = req.user._id;
  const now = new Date();
  const [pkgs, nextClasses, pending, hw, subs, announcements, tests, results, attendance] = await Promise.all([
    Package.find({ student: id, status: { $in: ['active', 'completed'] } }).sort({ createdAt: -1 }),
    ClassSession.find({ student: id, status: 'scheduled', date: { $gte: new Date(now.getTime() - 60 * 60000) } }).sort({ date: 1 }).limit(5),
    Payment.find({ student: id, status: 'pending' }),
    Homework.find({ $or: [{ assignedTo: { $size: 0 } }, { assignedTo: id }] }),
    Submission.find({ student: id }),
    Announcement.find({ $or: [{ audience: { $size: 0 } }, { audience: id }] }).sort({ pinned: -1, createdAt: -1 }).limit(4),
    Test.find({ $or: [{ assignedTo: { $size: 0 } }, { assignedTo: id }], date: { $gte: dayBounds().start } }).sort({ date: 1 }).limit(3),
    Result.find({ student: id }).populate('test', 'maxMarks'),
    ClassSession.find({ student: id, status: { $in: ['completed', 'absent'] } }).select('status'),
  ]);
  const pendingHw = hw.filter((h) => !subs.some((s) => String(s.homework) === String(h._id)));
  const scored = results.filter((r) => r.test && r.marks !== undefined && r.marks !== null);
  const avgScore = scored.length ? Math.round(scored.reduce((a, r) => a + (r.marks / r.test.maxMarks) * 100, 0) / scored.length) : null;
  const present = attendance.filter((s) => s.status === 'completed').length;
  res.json({
    packages: await Promise.all(pkgs.map(withStats)),
    nextClasses,
    pendingFees: pending.reduce((a, p) => a + p.amount, 0),
    pendingPayments: pending,
    pendingHomework: pendingHw.sort((a, b) => new Date(a.deadline || 8.64e15) - new Date(b.deadline || 8.64e15)).slice(0, 3),
    pendingHomeworkCount: pendingHw.length,
    announcements,
    upcomingTests: tests,
    avgScore,
    attendancePct: attendance.length ? Math.round((present / attendance.length) * 100) : null,
  });
}));

module.exports = router;
