const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// One collection for both the tutor (admin) and students.
const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['tutor', 'student'], required: true, default: 'student' },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    phone: { type: String, trim: true, sparse: true, unique: true },
    password: { type: String, required: true, select: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },

    // Student-only fields
    rollNo: { type: String, trim: true },
    grade: { type: String, trim: true },
    board: { type: String, trim: true },
    subjects: [{ type: String, trim: true }],
    parentName: { type: String, trim: true },
    parentPhone: { type: String, trim: true },
    address: { type: String, trim: true },
    joinedOn: { type: Date },
    notes: { type: String },

    // Tutor-only fields
    qualification: { type: String, trim: true },
    bio: { type: String },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.checkPassword = function checkPassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
