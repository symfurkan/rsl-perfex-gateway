import mongoose, { Schema, Model, Types } from 'mongoose';
import { IPerfexSession } from '../types/models.js';

// PerfexSession schema
const perfexSessionSchema = new Schema<IPerfexSession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  sessionCookie: {
    type: String,
    required: [true, 'Session cookie is required'],
    trim: true
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required'],
    index: true
  },
  lastUsed: {
    type: Date,
    default: Date.now,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  perfexUrl: {
    type: String,
    trim: true,
    default: null,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Optional field
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid URL format for perfexUrl'
    }
  }
}, {
  timestamps: true,
  versionKey: false,
  collection: 'perfex_sessions'
});

// Compound indexes for performance
perfexSessionSchema.index({ userId: 1, isActive: 1 });
perfexSessionSchema.index({ userId: 1, expiresAt: 1 });
perfexSessionSchema.index({ expiresAt: 1, isActive: 1 });
perfexSessionSchema.index({ lastUsed: 1 });

// TTL index for automatic cleanup of expired sessions
perfexSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware
perfexSessionSchema.pre('save', function(next) {
  // Update lastUsed when session is saved
  if (!this.isNew && this.isModified('sessionCookie')) {
    this.lastUsed = new Date();
  }
  
  // Ensure expiresAt is in the future for new sessions
  if (this.isNew && this.expiresAt <= new Date()) {
    const error = new Error('Session expiration date must be in the future');
    return next(error);
  }
  
  next();
});

// Instance methods
perfexSessionSchema.methods.isExpired = function(): boolean {
  return this.expiresAt <= new Date();
};

perfexSessionSchema.methods.isValid = function(): boolean {
  return this.isActive && !this.isExpired();
};

perfexSessionSchema.methods.refresh = function(newExpirationDate?: Date): Promise<IPerfexSession> {
  this.lastUsed = new Date();
  if (newExpirationDate) {
    this.expiresAt = newExpirationDate;
  }
  return this.save();
};

perfexSessionSchema.methods.deactivate = function(): Promise<IPerfexSession> {
  this.isActive = false;
  return this.save();
};

perfexSessionSchema.methods.extend = function(hoursToAdd: number = 24): Promise<IPerfexSession> {
  const newExpiration = new Date(this.expiresAt.getTime() + hoursToAdd * 60 * 60 * 1000);
  this.expiresAt = newExpiration;
  this.lastUsed = new Date();
  return this.save();
};

// Static methods
perfexSessionSchema.statics.findActiveByUserId = function(userId: Types.ObjectId) {
  return this.findOne({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ lastUsed: -1 });
};

perfexSessionSchema.statics.findValidSession = function(userId: Types.ObjectId, sessionCookie?: string) {
  const query: any = {
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  };
  
  if (sessionCookie) {
    query.sessionCookie = sessionCookie;
  }
  
  return this.findOne(query).sort({ lastUsed: -1 });
};

perfexSessionSchema.statics.deactivateAllForUser = function(userId: Types.ObjectId) {
  return this.updateMany(
    { userId, isActive: true },
    { $set: { isActive: false } }
  );
};

perfexSessionSchema.statics.cleanupExpiredSessions = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lte: new Date() } },
      { isActive: false }
    ]
  });
};

perfexSessionSchema.statics.getUserActiveSessions = function(userId: Types.ObjectId) {
  return this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  })
  .sort({ lastUsed: -1 })
  .select('-sessionCookie'); // Don't expose actual cookie values
};

perfexSessionSchema.statics.getActiveSessionsCount = function(userId?: Types.ObjectId) {
  const query: any = {
    isActive: true,
    expiresAt: { $gt: new Date() }
  };
  
  if (userId) {
    query.userId = userId;
  }
  
  return this.countDocuments(query);
};

perfexSessionSchema.statics.findSessionsExpiringIn = function(hours: number = 2) {
  const futureTime = new Date(Date.now() + hours * 60 * 60 * 1000);
  return this.find({
    isActive: true,
    expiresAt: { $lte: futureTime, $gt: new Date() }
  }).populate('userId', 'email');
};

// Virtual for session duration
perfexSessionSchema.virtual('sessionDuration').get(function() {
  if (this.createdAt && this.lastUsed) {
    return this.lastUsed.getTime() - this.createdAt.getTime();
  }
  return 0;
});

// Virtual for remaining time
perfexSessionSchema.virtual('remainingTime').get(function() {
  const now = new Date().getTime();
  const expires = this.expiresAt.getTime();
  return Math.max(0, expires - now);
});

// Ensure virtual fields are serialized
perfexSessionSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    const { _id, __v, sessionCookie, ...cleanRet } = ret;
    cleanRet.id = _id.toHexString();
    return cleanRet;
  }
});

// Interface for static methods
interface IPerfexSessionModel extends Model<IPerfexSession> {
  findActiveByUserId(userId: Types.ObjectId): Promise<IPerfexSession | null>;
  findValidSession(userId: Types.ObjectId, sessionCookie?: string): Promise<IPerfexSession | null>;
  deactivateAllForUser(userId: Types.ObjectId): Promise<any>;
  cleanupExpiredSessions(): Promise<any>;
  getUserActiveSessions(userId: Types.ObjectId): Promise<IPerfexSession[]>;
  getActiveSessionsCount(userId?: Types.ObjectId): Promise<number>;
  findSessionsExpiringIn(hours?: number): Promise<IPerfexSession[]>;
}

// Create and export the model
const PerfexSession = mongoose.model<IPerfexSession, IPerfexSessionModel>('PerfexSession', perfexSessionSchema);

export default PerfexSession;