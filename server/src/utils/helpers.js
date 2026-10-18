const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('../models/User');
const { Notification, ClassSession, Package, Settings } = require('../models');

// Wrap async route handlers so errors reach the error middleware
exports.ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- File uploads (stored in server/uploads) ----------
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
  },
});
exports.upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB (videos)
  fileFilter: (req, file, cb) => {
    const ok = /pdf|image|video|msword|officedocument|text/.test(file.mimetype);
    cb(ok ? null : new Error('Only PDF, image, video or document files are allowed'), ok);
  },
});

exports.fileInfo = (file) =>
  file && {
    name: file.originalname,
    url: `/uploads/${file.filename}`,
    type: file.mimetype,
    size: file.size,
  };

// ---------- Settings ----------
exports.getSettings = async () => {
  let s = await Settings.findOne();
  if (!s) s = await Settings.create({});
  return s;
};

// ---------- Notifications ----------
// recipients: array of user ids, or 'all' for every active student
exports.notify = async (recipients, { type = 'general', title, message, link }) => {
  let ids = recipients;
  if (recipients === 'all' || (Array.isArray(recipients) && recipients.length === 0)) {
    const students = await User.find({ role: 'student', status: 'active' }).select('_id');
    ids = students.map((s) => s._id);
  }
  if (!ids?.length) return;
  await Notification.insertMany(ids.map((user) => ({ user, type, title, message, link })));
};

exports.notifyTutor = async (payload) => {
  const tutors = await User.find({ role: 'tutor' }).select('_id');
  await exports.notify(tutors.map((t) => t._id), payload);
};

// ---------- Package counters (always computed from sessions, so they never drift) ----------
exports.packageStats = async (pkg) => {
  const sessions = await ClassSession.find({ package: pkg._id }).sort({ date: 1 });
  const count = (st) => sessions.filter((s) => s.status === st).length;
  const completed = count('completed');
  const now = new Date();
  const next = sessions.find((s) => s.status === 'scheduled' && s.date >= now);
  const remaining = Math.max(pkg.totalClasses - completed, 0);
  return {
    completed,
    remaining,
    absent: count('absent'),
    cancelled: count('cancelled'),
    rescheduled: count('rescheduled'),
    scheduled: count('scheduled'),
    nextClass: next ? { _id: next._id, date: next.date, subject: next.subject } : null,
    progress: pkg.totalClasses ? Math.round((completed / pkg.totalClasses) * 100) : 0,
    isExpired: pkg.expiryDate ? pkg.expiryDate < now : false,
  };
};

exports.withStats = async (pkg) => ({ ...pkg.toObject(), stats: await exports.packageStats(pkg) });

// ---------- Auto-create sessions from a weekly timetable ----------
// Creates sessions from startDate until the package has `totalClasses` scheduled/completed sessions.
// Absent / cancelled / rescheduled classes don't use up the package, so a makeup class is added at the end
// (or the expiry date is reached). Existing sessions are kept.
exports.generateSessions = async (pkg) => {
  if (!pkg.schedule?.length) return 0;
  const existing = await ClassSession.countDocuments({
    package: pkg._id,
    status: { $in: ['scheduled', 'completed'] },
  });
  let needed = pkg.totalClasses - existing;
  if (needed <= 0) return 0;

  const last = await ClassSession.findOne({ package: pkg._id }).sort({ date: -1 });
  const cursor = new Date(Math.max(new Date(pkg.startDate).getTime(), last ? last.date.getTime() + 60000 : 0));
  cursor.setHours(0, 0, 0, 0);
  const limit = pkg.expiryDate ? new Date(pkg.expiryDate) : new Date(cursor.getTime() + 365 * 864e5);
  limit.setHours(23, 59, 59, 999);

  const toCreate = [];
  const day = new Date(cursor);
  while (needed > 0 && day <= limit) {
    const slots = pkg.schedule.filter((s) => Number(s.day) === day.getDay()).sort((a, b) => a.time.localeCompare(b.time));
    for (const slot of slots) {
      if (needed <= 0) break;
      const [h, m] = (slot.time || '17:00').split(':').map(Number);
      const date = new Date(day);
      date.setHours(h, m || 0, 0, 0);
      if (date < new Date(pkg.startDate) || (last && date <= last.date)) continue;
      toCreate.push({
        student: pkg.student,
        package: pkg._id,
        subject: pkg.subject,
        date,
        durationMins: pkg.durationMins || 60,
      });
      needed -= 1;
    }
    day.setDate(day.getDate() + 1);
  }
  if (toCreate.length) await ClassSession.insertMany(toCreate);
  return toCreate.length;
};

// After a class is completed, warn the student and tutor if balance is low
exports.checkLowBalance = async (packageId) => {
  if (!packageId) return;
  const pkg = await Package.findById(packageId).populate('student', 'name');
  if (!pkg) return;
  const settings = await exports.getSettings();
  const stats = await exports.packageStats(pkg);
  if (stats.remaining === 0) {
    pkg.status = 'completed';
    await pkg.save();
  }
  if (stats.remaining <= settings.lowBalanceThreshold) {
    const msg = `${stats.remaining} class${stats.remaining === 1 ? '' : 'es'} left in your ${pkg.subject} package.`;
    await exports.notify([pkg.student._id], { type: 'balance', title: 'Low class balance', message: `${msg} Please renew to continue.`, link: '/student' });
  }
};

exports.nextReceiptNo = async (Payment) => {
  const count = await Payment.countDocuments({ status: 'paid' });
  return `ERA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
};

exports.nextRollNo = async () => {
  const last = await User.find({ role: 'student', rollNo: { $exists: true } }).sort({ createdAt: -1 }).limit(50);
  const max = last.reduce((m, u) => Math.max(m, parseInt(String(u.rollNo).replace(/\D/g, ''), 10) || 0), 1000);
  return String(max + 1);
};
