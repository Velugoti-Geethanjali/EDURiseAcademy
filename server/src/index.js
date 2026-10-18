require('dotenv').config();
// Some local DNS resolvers refuse the SRV lookups that mongodb+srv:// needs; use public DNS instead
if (process.env.NODE_ENV !== 'production') require('dns').setServers(['8.8.8.8', '1.1.1.1']);
// Class times are generated in Indian time no matter where the server is hosted
process.env.TZ = process.env.TZ || 'Asia/Kolkata';
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const User = require('./models/User');
const { ClassSession } = require('./models');
const { notify, getSettings } = require('./utils/helpers');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : true }));
app.use(express.json({ limit: '2mb' }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/packages', require('./routes/packages'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/homework', require('./routes/homework'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api', require('./routes/misc'));

// Serve the built React app (after `npm run build` in /client)
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api|uploads).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((req, res) => res.status(404).json({ message: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.code === 11000) return res.status(400).json({ message: 'Duplicate entry – this record already exists' });
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
  if (err.name === 'MulterError' || /allowed/.test(err.message)) return res.status(400).json({ message: err.message });
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

// Create the tutor account from .env the first time the app starts
async function ensureTutor() {
  const exists = await User.findOne({ role: 'tutor' });
  if (exists) return;
  await User.create({
    role: 'tutor', status: 'active',
    name: process.env.TUTOR_NAME || 'Tutor',
    email: process.env.TUTOR_EMAIL || 'geethanjalireddy31@gmail.com',
    phone: process.env.TUTOR_PHONE || undefined,
    password: process.env.TUTOR_PASSWORD || 'Tutor@123',
  });
  console.log(`Tutor account created: ${process.env.TUTOR_EMAIL}`);
}

// Every 15 minutes: remind students about classes starting in the next 24 hours
async function sendClassReminders() {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 3600 * 1000);
    const due = await ClassSession.find({ status: 'scheduled', reminderSent: false, date: { $gte: now, $lte: soon } });
    for (const s of due) {
      const when = s.date.toLocaleString('en-IN', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
      await notify([s.student], { type: 'class', title: 'Upcoming class', message: `${s.subject} – ${when}`, link: '/student/classes' });
      s.reminderSent = true;
      await s.save();
    }
  } catch (e) {
    console.error('Reminder job failed:', e.message);
  }
}

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME || undefined })
  .then(async () => {
    console.log('MongoDB connected');
    await ensureTutor();
    await getSettings();
    sendClassReminders();
    setInterval(sendClassReminders, 15 * 60 * 1000);
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error('MongoDB connection failed:', e.message);
    process.exit(1);
  });
