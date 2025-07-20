import mongoose, { Schema, Model } from 'mongoose';
import { IUser } from '../types/models.js';

// Encrypted credentials schema
const encryptedCredentialsSchema = new Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  encryptionKey: {
    type: String,
    required: true
  }
}, { _id: false });

// User schema
const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ]
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
    minlength: [60, 'Invalid password hash format']
  },
  perfexCredentials: {
    type: encryptedCredentialsSchema,
    required: [true, 'Perfex credentials are required']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  versionKey: false,
  collection: 'users'
});

// Indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ lastLoginAt: 1 });

// Pre-save middleware
userSchema.pre('save', function(next) {
  // Ensure email is lowercase
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase().trim();
  }
  
  // Update perfex credentials email to lowercase
  if (this.isModified('perfexCredentials.email')) {
    this.perfexCredentials.email = this.perfexCredentials.email.toLowerCase().trim();
  }
  
  next();
});

// Instance methods
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  
  // Remove sensitive data from JSON output
  delete user.passwordHash;
  delete user.perfexCredentials;
  
  return user;
};

userSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

userSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

userSchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

// Static methods
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ 
    email: email.toLowerCase().trim(),
    isActive: true 
  });
};

userSchema.statics.findActiveUsers = function(limit = 50, skip = 0) {
  return this.find({ isActive: true })
    .select('-passwordHash -perfexCredentials')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

userSchema.statics.countActiveUsers = function() {
  return this.countDocuments({ isActive: true });
};

userSchema.statics.findRecentlyActive = function(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    isActive: true,
    lastLoginAt: { $gte: since }
  })
  .select('-passwordHash -perfexCredentials')
  .sort({ lastLoginAt: -1 });
};

// Virtual for full name (if needed later)
userSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    const { _id, __v, passwordHash, perfexCredentials, ...cleanRet } = ret;
    cleanRet.id = _id.toHexString();
    return cleanRet;
  }
});

// Interface for static methods
interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findActiveUsers(limit?: number, skip?: number): Promise<IUser[]>;
  countActiveUsers(): Promise<number>;
  findRecentlyActive(hours?: number): Promise<IUser[]>;
}

// Create and export the model
const User = mongoose.model<IUser, IUserModel>('User', userSchema);

export default User;