const router = require('express').Router();
const User = require('../models/User');
const { protect, signToken } = require('../middleware/auth');
const { ah, notifyTutor, getSettings, nextRollNo } = require('../utils/helpers');

// Public tuition info for the landing page
router.get('/settings', ah(async (req, res) => {
  const s = await getSettings();
  const tutor = await User.findOne({ role: 'tutor' }).select('name qualification bio');
  res.json({ ...s.toObject(), tutor });
}));

// Student self-registration (active immediately)
router.post('/register', ah(async (req, res) => {
  const { name, email, phone, password, grade, board, subjects, parentName, parentPhone, address } = req.body;
  if (!name || !password || (!email && !phone)) {
    return res.status(400).json({ message: 'Name, password and phone or email are required' });
  }
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const or = [];
  if (email) or.push({ email: email.toLowerCase() });
  if (phone) or.push({ phone });
  if (await User.findOne({ $or: or })) return res.status(400).json({ message: 'This phone or email is already registered' });

  const user = await User.create({
    role: 'student', status: 'active', rollNo: await nextRollNo(), joinedOn: new Date(), name, email: email || undefined, phone: phone || undefined, password,
    grade, board, subjects: Array.isArray(subjects) ? subjects : subjects ? [subjects] : [],
    parentName, parentPhone, address,
  });
  await notifyTutor({ type: 'registration', title: 'New student registered', message: `${name} (${grade || 'no class'}) has registered.`, link: '/tutor/students' });
  res.status(201).json({ message: 'Registration successful', token: signToken(user), user });
}));

// Login with email or phone
router.post('/login', ah(async (req, res) => {
  const { identifier, password, role } = req.body;
  if (!identifier || !password) return res.status(400).json({ message: 'Enter your phone/email and password' });
  const id = String(identifier).trim();
  const user = await User.findOne({ $or: [{ email: id.toLowerCase() }, { phone: id }, { rollNo: id }] }).select('+password');
  if (!user || !(await user.checkPassword(password))) return res.status(400).json({ message: 'Incorrect login details' });
  if (role && user.role !== role) {
    return res.status(400).json({ message: user.role === 'tutor' ? 'Please use Tutor Login' : 'Please use Student Login' });
  }
  if (user.status !== 'active') return res.status(403).json({ message: 'Your account is not active. Please contact the tutor.' });
  res.json({ token: signToken(user), user });
}));

router.get('/me', protect, (req, res) => res.json(req.user));

// Update own profile (students can edit contact details only)
router.put('/me', protect, ah(async (req, res) => {
  const allowed = req.user.role === 'tutor'
    ? ['name', 'email', 'phone', 'qualification', 'bio']
    : ['email', 'phone', 'parentName', 'parentPhone', 'address'];
  allowed.forEach((k) => { if (req.body[k] !== undefined) req.user[k] = req.body[k] || undefined; });
  await req.user.save();
  res.json(req.user);
}));

router.put('/password', protect, ah(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.checkPassword(currentPassword || ''))) return res.status(400).json({ message: 'Current password is incorrect' });
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated' });
}));

module.exports = router;
