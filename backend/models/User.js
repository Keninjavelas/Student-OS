const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['student', 'admin', 'mentor'],
      default: 'student',
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      default: null,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    profile: {
      avatar: {
        type: String,
        default: null,
      },
      bio: {
        type: String,
        maxlength: 500,
      },
      phone: {
        type: String,
        default: null,
      },
    },
    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      twoFactorEnabled: {
        type: Boolean,
        default: false,
      },
      twoFactorSecret: {
        type: String,
        select: false,
      },
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      loginHistory: [
        {
          timestamp: Date,
          ipAddress: String,
          userAgent: String,
        },
      ],
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
userSchema.methods.isAccountLocked = function () {
  return this.lockUntil && this.lockUntil > new Date();
};

// Increment login attempts
userSchema.methods.incLoginAttempts = async function () {
  const lockoutThreshold = parseInt(process.env.ACCOUNT_LOCKOUT_THRESHOLD) || 5;
  const lockoutDuration = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MS) || 1800000;

  if (this.lockUntil && this.lockUntil > new Date()) {
    return this.save();
  }

  const updates = {
    $inc: { loginAttempts: 1 },
  };

  if (this.loginAttempts + 1 >= lockoutThreshold && !this.isAccountLocked()) {
    updates.lockUntil = new Date(Date.now() + lockoutDuration);
  }

  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { loginAttempts: 0, lockUntil: null },
  });
};

// Get public profile (exclude sensitive fields)
userSchema.methods.getPublicProfile = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpires;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.loginAttempts;
  delete userObject.lockUntil;
  delete userObject.metadata;
  delete userObject.preferences.twoFactorSecret;
  return userObject;
};

// Compound indexes
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
