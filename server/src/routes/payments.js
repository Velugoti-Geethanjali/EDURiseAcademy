const router = require('express').Router();
const { Payment } = require('../models');
const { protect, tutorOnly } = require('../middleware/auth');
const { ah, notify, nextReceiptNo, getSettings } = require('../utils/helpers');

router.use(protect);

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

router.get('/', ah(async (req, res) => {
  const filter = {};
  if (req.user.role === 'student') filter.student = req.user._id;
  else if (req.query.student) filter.student = req.query.student;
  if (req.query.status) filter.status = req.query.status;
  const list = await Payment.find(filter).populate('student', 'name grade rollNo phone parentName parentPhone').sort({ status: -1, dueDate: 1, createdAt: -1 });
  res.json(list);
}));

// Receipt data (student can only see own)
router.get('/:id', ah(async (req, res) => {
  const p = await Payment.findById(req.params.id).populate('student', 'name grade rollNo phone parentName').populate('package', 'title subject');
  if (!p) return res.status(404).json({ message: 'Not found' });
  if (req.user.role !== 'tutor' && String(p.student._id) !== String(req.user._id)) return res.status(403).json({ message: 'Not allowed' });
  res.json({ payment: p, settings: await getSettings() });
}));

// Create a fee due (or directly record a paid fee)
router.post('/', tutorOnly, ah(async (req, res) => {
  const { student, description, amount, dueDate, status, paidOn, mode, note, package: pkg } = req.body;
  if (!student || !description || amount === undefined) return res.status(400).json({ message: 'Student, description and amount are required' });
  const p = new Payment({ student, description, amount, dueDate, package: pkg || undefined, note });
  if (status === 'paid') {
    p.status = 'paid';
    p.paidOn = paidOn || new Date();
    p.mode = mode || 'Cash';
    p.receiptNo = await nextReceiptNo(Payment);
  } else {
    await notify([student], { type: 'fee', title: 'Fee due', message: `${description}: ${inr(amount)}${dueDate ? ` due by ${new Date(dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}.`, link: '/student/payments' });
  }
  await p.save();
  res.status(201).json(await p.populate('student', 'name grade rollNo phone'));
}));

router.patch('/:id/pay', tutorOnly, ah(async (req, res) => {
  const p = await Payment.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });
  p.status = 'paid';
  p.paidOn = req.body.paidOn || new Date();
  p.mode = req.body.mode || 'Cash';
  if (req.body.amount !== undefined) p.amount = req.body.amount;
  if (req.body.note !== undefined) p.note = req.body.note;
  if (!p.receiptNo) p.receiptNo = await nextReceiptNo(Payment);
  await p.save();
  await notify([p.student], { type: 'fee', title: 'Payment received', message: `${inr(p.amount)} received for ${p.description}. Receipt ${p.receiptNo}.`, link: '/student/payments' });
  res.json(await p.populate('student', 'name grade rollNo phone'));
}));

router.patch('/:id/unpay', tutorOnly, ah(async (req, res) => {
  const p = await Payment.findByIdAndUpdate(req.params.id, { status: 'pending', paidOn: null, mode: '' }, { new: true }).populate('student', 'name grade rollNo phone');
  res.json(p);
}));

router.put('/:id', tutorOnly, ah(async (req, res) => {
  const p = await Payment.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });
  ['description', 'amount', 'dueDate', 'note', 'mode', 'paidOn'].forEach((k) => { if (req.body[k] !== undefined) p[k] = req.body[k]; });
  await p.save();
  res.json(await p.populate('student', 'name grade rollNo phone'));
}));

// Send reminders for all pending fees
router.post('/remind', tutorOnly, ah(async (req, res) => {
  const pending = await Payment.find({ status: 'pending', ...(req.body.id ? { _id: req.body.id } : {}) });
  for (const p of pending) {
    await notify([p.student], { type: 'fee', title: 'Fee reminder', message: `${p.description}: ${inr(p.amount)} is pending. Please pay at the earliest.`, link: '/student/payments' });
  }
  res.json({ message: `Reminder sent for ${pending.length} pending fee(s)` });
}));

router.delete('/:id', tutorOnly, ah(async (req, res) => {
  await Payment.deleteOne({ _id: req.params.id });
  res.json({ message: 'Deleted' });
}));

module.exports = router;
