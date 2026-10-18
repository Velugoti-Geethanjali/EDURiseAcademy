const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Requires a valid token; attaches req.user
exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Please log in' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.status !== 'active') return res.status(401).json({ message: 'Account not active' });
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ message: 'Session expired, please log in again' });
  }
};

// Only the tutor can manage data
exports.tutorOnly = (req, res, next) => {
  if (req.user?.role !== 'tutor') return res.status(403).json({ message: 'Only the tutor can do this' });
  next();
};
