// Optional: fills the database with sample students, packages, fees, homework and tests
// Run: npm run seed:demo        (add --reset to wipe existing data first, tutor is kept)
require('dotenv').config();
// Class times are generated in Indian time no matter where the server is hosted
process.env.TZ = process.env.TZ || 'Asia/Kolkata';
const mongoose = require('mongoose');
const User = require('./models/User');
const M = require('./models');
const { generateSessions } = require('./utils/helpers');

const days = (n) => new Date(Date.now() + n * 864e5);

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME || undefined });
  if (process.argv.includes('--reset')) {
    await Promise.all(Object.values(M).filter((m) => m.modelName !== 'Settings').map((m) => m.deleteMany({})));
    await User.deleteMany({ role: 'student' });
    console.log('Existing student data removed');
  }

  if (!(await User.findOne({ role: 'tutor' }))) {
    await User.create({ role: 'tutor', status: 'active', name: process.env.TUTOR_NAME || 'Tutor', email: process.env.TUTOR_EMAIL, phone: process.env.TUTOR_PHONE, password: process.env.TUTOR_PASSWORD || 'Tutor@123' });
  }

  const people = [
    { name: 'Rahul Sharma', phone: '9000000001', grade: 'Class 10', board: 'CBSE', subjects: ['Mathematics'], parentName: 'Suresh Sharma', parentPhone: '9810055902' },
    { name: 'Priya Nair', phone: '9000000002', grade: 'Class 10', board: 'CBSE', subjects: ['Mathematics', 'Physics'], parentName: 'Lakshmi Nair', parentPhone: '9810055903' },
    { name: 'Arjun Patel', phone: '9000000003', grade: 'Class 12', board: 'CBSE', subjects: ['Physics'], parentName: 'Mahesh Patel', parentPhone: '9810055904' },
    { name: 'Ananya Iyer', phone: '9000000004', grade: 'Class 9', board: 'ICSE', subjects: ['Mathematics'], parentName: 'Ramesh Iyer', parentPhone: '9810055905' },
  ];
  const students = [];
  let roll = 1001;
  for (const p of people) {
    let s = await User.findOne({ phone: p.phone });
    if (!s) s = await User.create({ ...p, role: 'student', status: 'active', password: 'student123', rollNo: String(roll), joinedOn: days(-40) });
    roll += 1;
    students.push(s);
  }
  if (!(await User.findOne({ phone: '9000000005' }))) {
    await User.create({ name: 'Sneha Rao', phone: '9000000005', grade: 'Class 11', subjects: ['Chemistry'], parentName: 'Kiran Rao', parentPhone: '9810055906', role: 'student', status: 'active', password: 'student123' });
  }

  const plans = [
    { s: 0, subject: 'Mathematics', total: 12, done: 7, sched: [{ day: 1, time: '18:00' }, { day: 3, time: '18:00' }, { day: 5, time: '18:00' }], fee: 6000 },
    { s: 1, subject: 'Physics', total: 8, done: 6, sched: [{ day: 2, time: '17:00' }, { day: 4, time: '17:00' }], fee: 4500 },
    { s: 2, subject: 'Physics', total: 16, done: 4, sched: [{ day: 1, time: '19:30' }, { day: 6, time: '10:00' }], fee: 8000 },
    { s: 3, subject: 'Mathematics', total: 10, done: 9, sched: [{ day: 3, time: '16:00' }, { day: 6, time: '16:00' }], fee: 5000 },
  ];
  for (const pl of plans) {
    const st = students[pl.s];
    if (await M.Package.findOne({ student: st._id, subject: pl.subject })) continue;
    const pkg = await M.Package.create({
      student: st._id, subject: pl.subject, title: `${pl.total}-Class ${pl.subject} Pack`, totalClasses: pl.total,
      startDate: days(-21), expiryDate: days(75), feeAmount: pl.fee, schedule: pl.sched,
    });
    await generateSessions(pkg);
    const past = await M.ClassSession.find({ package: pkg._id, date: { $lt: new Date() } }).sort({ date: 1 });
    // Mark past sessions: first `done` completed, others absent
    for (let i = 0; i < past.length; i += 1) {
      past[i].status = i < pl.done ? 'completed' : 'absent';
      past[i].topic = i < pl.done ? `Chapter ${i + 1}` : undefined;
      await past[i].save();
    }
    await generateSessions(pkg); // add makeup classes for the absent ones
    await M.Payment.create({ student: st._id, package: pkg._id, description: `${pkg.title} fee`, amount: pl.fee, dueDate: days(-28), status: 'paid', paidOn: days(-29), mode: 'UPI', receiptNo: `BMT-${new Date().getFullYear()}-${String(pl.s + 1).padStart(4, '0')}` });
    if (pl.s % 2 === 1) await M.Payment.create({ student: st._id, description: `${pl.subject} renewal fee`, amount: pl.fee, dueDate: days(5) });
  }

  if (!(await M.Homework.countDocuments())) {
    const hw = await M.Homework.create({ title: 'Quadratic Equations – Exercise 4.3', subject: 'Mathematics', description: 'Solve Q1 to Q10. Show all steps.', deadline: days(2), maxMarks: 20, assignedTo: [students[0]._id, students[1]._id, students[3]._id] });
    await M.Homework.create({ title: 'Laws of Motion – Numericals', subject: 'Physics', description: 'Complete the worksheet shared in class.', deadline: days(4), maxMarks: 10, assignedTo: [students[1]._id, students[2]._id] });
    await M.Submission.create({ homework: hw._id, student: students[0]._id, text: 'Done all 10 questions, attached in class notebook.', submittedAt: days(-0.2) });
  }
  if (!(await M.Test.countDocuments())) {
    const t1 = await M.Test.create({ name: 'Unit Test 1', subject: 'Mathematics', date: days(-20), maxMarks: 50 });
    const t2 = await M.Test.create({ name: 'Unit Test 2', subject: 'Mathematics', date: days(-6), maxMarks: 50 });
    await M.Test.create({ name: 'Monthly Test – October', subject: 'Mathematics', date: days(6), maxMarks: 50, syllabus: 'Quadratic equations, AP' });
    const marks = [[38, 44], [41, 43], [30, 36], [45, 47]];
    for (let i = 0; i < students.length; i += 1) {
      await M.Result.create({ test: t1._id, student: students[i]._id, marks: marks[i][0], feedback: 'Good effort' });
      await M.Result.create({ test: t2._id, student: students[i]._id, marks: marks[i][1], feedback: 'Improving steadily' });
    }
  }
  if (!(await M.Announcement.countDocuments())) {
    await M.Announcement.create({ title: 'Doubt clearing session this Saturday', body: 'Open doubt session from 10:00 AM to 12:00 PM for all students.', category: 'Special Session', pinned: true });
    await M.Announcement.create({ title: 'Diwali break', body: 'Classes will remain closed for 3 days during Diwali. Missed classes will be rescheduled.', category: 'Holiday' });
  }
  console.log('Demo data ready. Student logins: phone 9000000001 … 9000000004, password student123');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
