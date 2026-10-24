const mongoose = require('mongoose');

const { Schema } = mongoose;
const ref = (model) => ({ type: Schema.Types.ObjectId, ref: model });
const fileSchema = new Schema({ name: String, url: String, type: String, size: Number }, { _id: false });

// ---------- Class package (e.g. 12 classes of Maths) ----------
const packageSchema = new Schema(
  {
    student: { ...ref('User'), required: true },
    subject: { type: String, required: true },
    title: { type: String },
    totalClasses: { type: Number, required: true, min: 1 },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date },
    feeType: { type: String, enum: ['package', 'monthly'], default: 'package' },
    feeAmount: { type: Number, default: 0 },
    // Weekly timetable, e.g. [{ day: 1, time: '18:00' }] (0 = Sunday)
    schedule: [{ day: Number, time: String, _id: false }],
    durationMins: { type: Number, default: 60 },
    status: { type: String, enum: ['active', 'completed', 'expired', 'cancelled'], default: 'active' },
  },
  { timestamps: true }
);

// ---------- A single class session ----------
// status: scheduled -> completed | absent | cancelled | rescheduled
const sessionSchema = new Schema(
  {
    student: { ...ref('User'), required: true },
    package: ref('Package'),
    subject: { type: String, required: true },
    date: { type: Date, required: true },
    durationMins: { type: Number, default: 60 },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'absent', 'cancelled', 'rescheduled'],
      default: 'scheduled',
    },
    topic: String,
    notes: String,
    rescheduledTo: ref('ClassSession'),
    rescheduledFrom: ref('ClassSession'),
    reminderSent: { type: Boolean, default: false },
    markedAt: Date,
  },
  { timestamps: true }
);
sessionSchema.index({ date: 1 });
sessionSchema.index({ student: 1, date: 1 });

// ---------- Fees (manual tracking, no gateway) ----------
const paymentSchema = new Schema(
  {
    student: { ...ref('User'), required: true },
    package: ref('Package'),
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: Date,
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paidOn: Date,
    mode: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other', ''], default: '' },
    note: String,
    receiptNo: String,
  },
  { timestamps: true }
);

// ---------- Homework ----------
const homeworkSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    subject: String,
    assignedTo: [ref('User')], // empty = all active students
    deadline: Date,
    maxMarks: { type: Number, default: 10 },
    attachments: [fileSchema],
  },
  { timestamps: true }
);

const submissionSchema = new Schema(
  {
    homework: { ...ref('Homework'), required: true },
    student: { ...ref('User'), required: true },
    text: String,
    files: [fileSchema],
    submittedAt: { type: Date, default: Date.now },
    marks: Number,
    comment: String,
    reviewedAt: Date,
  },
  { timestamps: true }
);
submissionSchema.index({ homework: 1, student: 1 }, { unique: true });

// ---------- Study material ----------
const materialSchema = new Schema(
  {
    title: { type: String, required: true },
    subject: String,
    description: String,
    file: fileSchema,
    link: String,
    assignedTo: [ref('User')], // empty = everyone
  },
  { timestamps: true }
);

// ---------- Tests & results ----------
const testSchema = new Schema(
  {
    name: { type: String, required: true },
    subject: String,
    date: Date,
    maxMarks: { type: Number, required: true, default: 100 },
    syllabus: String,
    assignedTo: [ref('User')], // empty = everyone
  },
  { timestamps: true }
);

const resultSchema = new Schema(
  {
    test: { ...ref('Test'), required: true },
    student: { ...ref('User'), required: true },
    marks: Number,
    feedback: String,
    answerSheet: fileSchema,
  },
  { timestamps: true }
);
resultSchema.index({ test: 1, student: 1 }, { unique: true });

// ---------- Announcements & notifications ----------
const announcementSchema = new Schema(
  {
    title: { type: String, required: true },
    body: String,
    category: { type: String, default: 'General' },
    audience: [ref('User')], // empty = all students
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const notificationSchema = new Schema(
  {
    user: { ...ref('User'), required: true },
    type: {
      type: String,
      enum: ['class', 'schedule', 'homework', 'test', 'fee', 'balance', 'announcement', 'registration', 'general'],
      default: 'general',
    },
    title: String,
    message: String,
    link: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
notificationSchema.index({ user: 1, createdAt: -1 });

// ---------- Tuition settings (single document) ----------
const settingsSchema = new Schema(
  {
    tuitionName: { type: String, default: 'EduuRise Academy' },
    tagline: { type: String, default: 'Personalised tutoring. Measurable academic growth.' },
    logoUrl: String,
    phone: { type: String, default: '+91 72070 39791' },
    whatsapp: { type: String, default: '917207039791' },
    email: { type: String, default: 'geethanjalireddy31@gmail.com' },
    address: { type: String, default: 'Hyderabad, Telangana' },
    subjects: { type: [String], default: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'] },
    grades: {
      type: [String],
      default: ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'],
    },
    lowBalanceThreshold: { type: Number, default: 2 },
  },
  { timestamps: true }
);

module.exports = {
  Package: mongoose.model('Package', packageSchema),
  ClassSession: mongoose.model('ClassSession', sessionSchema),
  Payment: mongoose.model('Payment', paymentSchema),
  Homework: mongoose.model('Homework', homeworkSchema),
  Submission: mongoose.model('Submission', submissionSchema),
  Material: mongoose.model('Material', materialSchema),
  Test: mongoose.model('Test', testSchema),
  Result: mongoose.model('Result', resultSchema),
  Announcement: mongoose.model('Announcement', announcementSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  Settings: mongoose.model('Settings', settingsSchema),
};
