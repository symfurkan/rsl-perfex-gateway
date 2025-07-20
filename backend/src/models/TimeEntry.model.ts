import mongoose, { Schema, Model, Types } from 'mongoose';
import { ITimeEntry } from '../types/models.js';

// TimeEntry schema
const timeEntrySchema = new Schema<ITimeEntry>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'LocalTask',
    required: [true, 'Task ID is required'],
    index: true
  },
  perfexTaskId: {
    type: String,
    required: [true, 'Perfex Task ID is required'],
    trim: true,
    index: true
  },
  perfexTimerId: {
    type: String,
    trim: true,
    index: true,
    sparse: true // Allow null values but index non-null ones
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required'],
    index: true
  },
  endTime: {
    type: Date,
    index: true,
    validate: {
      validator: function(this: ITimeEntry, value: Date) {
        if (!value) return true; // Optional field
        return value > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  duration: {
    type: Number,
    min: [0, 'Duration cannot be negative'],
    validate: {
      validator: function(this: ITimeEntry, value: number) {
        if (value === undefined || value === null) return true;
        
        // If both startTime and endTime exist, validate calculated duration
        if (this.startTime && this.endTime) {
          const calculatedDuration = Math.round((this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60));
          return Math.abs(value - calculatedDuration) <= 1; // Allow 1 minute tolerance
        }
        
        return true;
      },
      message: 'Duration must match the time difference between start and end times'
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  isRunning: {
    type: Boolean,
    default: false,
    index: true
  },
  isSynced: {
    type: Boolean,
    default: false,
    index: true
  },
  syncedAt: {
    type: Date,
    index: true
  },
  lastSyncAttempt: {
    type: Date,
    index: true
  },
  syncError: {
    type: String,
    trim: true,
    maxlength: [1000, 'Sync error message cannot exceed 1000 characters']
  }
}, {
  timestamps: true,
  versionKey: false,
  collection: 'time_entries'
});

// Compound indexes for performance
timeEntrySchema.index({ userId: 1, taskId: 1 });
timeEntrySchema.index({ userId: 1, isRunning: 1 });
timeEntrySchema.index({ userId: 1, startTime: 1 });
timeEntrySchema.index({ userId: 1, isSynced: 1 });
timeEntrySchema.index({ taskId: 1, startTime: 1 });
timeEntrySchema.index({ perfexTaskId: 1, perfexTimerId: 1 });
timeEntrySchema.index({ isRunning: 1, userId: 1 });
timeEntrySchema.index({ isSynced: 1, lastSyncAttempt: 1 });

// Unique constraint: only one running timer per user
timeEntrySchema.index(
  { userId: 1, isRunning: 1 },
  { 
    unique: true,
    partialFilterExpression: { isRunning: true }
  }
);

// Pre-save middleware
timeEntrySchema.pre('save', function(next) {
  // Calculate duration if not provided and both times exist
  if (this.startTime && this.endTime && !this.duration) {
    this.duration = Math.round((this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60));
  }
  
  // Set endTime if stopping a running timer
  if (this.isModified('isRunning') && !this.isRunning && !this.endTime) {
    this.endTime = new Date();
    if (!this.duration) {
      this.duration = Math.round((this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60));
    }
  }
  
  // Clear sync error when successfully synced
  if (this.isModified('isSynced') && this.isSynced) {
    this.syncError = null;
    this.syncedAt = new Date();
  }
  
  // Update lastSyncAttempt when trying to sync
  if (this.isModified('syncError') && this.syncError) {
    this.lastSyncAttempt = new Date();
  }
  
  next();
});

// Instance methods
timeEntrySchema.methods.stop = function(notes?: string): Promise<ITimeEntry> {
  if (!this.isRunning) {
    throw new Error('Timer is not running');
  }
  
  this.isRunning = false;
  this.endTime = new Date();
  this.duration = Math.round((this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60));
  
  if (notes) {
    this.notes = notes;
  }
  
  return this.save();
};

timeEntrySchema.methods.markAsSynced = function(perfexTimerId?: string): Promise<ITimeEntry> {
  this.isSynced = true;
  this.syncedAt = new Date();
  this.syncError = null;
  
  if (perfexTimerId) {
    this.perfexTimerId = perfexTimerId;
  }
  
  return this.save();
};

timeEntrySchema.methods.markSyncError = function(error: string): Promise<ITimeEntry> {
  this.syncError = error;
  this.lastSyncAttempt = new Date();
  return this.save();
};

timeEntrySchema.methods.getCurrentDuration = function(): number {
  if (!this.isRunning) {
    return this.duration || 0;
  }
  
  const now = new Date();
  return Math.round((now.getTime() - this.startTime.getTime()) / (1000 * 60));
};

timeEntrySchema.methods.updateNotes = function(notes: string): Promise<ITimeEntry> {
  this.notes = notes;
  return this.save();
};

timeEntrySchema.methods.retrySyncAfter = function(minutes: number = 5): boolean {
  if (!this.lastSyncAttempt) return true;
  
  const retryAfter = new Date(this.lastSyncAttempt.getTime() + minutes * 60 * 1000);
  return new Date() >= retryAfter;
};

// Static methods
timeEntrySchema.statics.findRunningTimer = function(userId: Types.ObjectId) {
  return this.findOne({
    userId,
    isRunning: true
  }).populate('taskId');
};

timeEntrySchema.statics.findByUserId = function(userId: Types.ObjectId, options: any = {}) {
  const query: any = { userId };
  
  if (options.taskId) query.taskId = options.taskId;
  if (options.isRunning !== undefined) query.isRunning = options.isRunning;
  if (options.isSynced !== undefined) query.isSynced = options.isSynced;
  
  if (options.dateRange) {
    query.startTime = {
      $gte: options.dateRange.start,
      $lte: options.dateRange.end
    };
  }
  
  return this.find(query)
    .populate('taskId', 'title perfexTaskId')
    .sort(options.sort || { startTime: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

timeEntrySchema.statics.findByTaskId = function(taskId: Types.ObjectId, options: any = {}) {
  const query: any = { taskId };
  
  if (options.dateRange) {
    query.startTime = {
      $gte: options.dateRange.start,
      $lte: options.dateRange.end
    };
  }
  
  return this.find(query)
    .sort({ startTime: -1 })
    .limit(options.limit || 100);
};

timeEntrySchema.statics.findUnsyncedEntries = function(limit: number = 50) {
  return this.find({
    isSynced: false,
    isRunning: false,
    endTime: { $exists: true }
  })
  .populate('taskId', 'title perfexTaskId')
  .sort({ endTime: 1 })
  .limit(limit);
};

timeEntrySchema.statics.getTimeStats = function(userId: Types.ObjectId, dateRange?: { start: Date; end: Date }) {
  const matchStage: any = { userId, isRunning: false };
  
  if (dateRange) {
    matchStage.startTime = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalEntries: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        avgDuration: { $avg: '$duration' },
        syncedEntries: {
          $sum: { $cond: ['$isSynced', 1, 0] }
        }
      }
    }
  ]);
};

timeEntrySchema.statics.getDailyStats = function(userId: Types.ObjectId, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        userId,
        isRunning: false,
        startTime: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$startTime'
          }
        },
        totalDuration: { $sum: '$duration' },
        entriesCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

timeEntrySchema.statics.getTaskTimeStats = function(taskId: Types.ObjectId) {
  return this.aggregate([
    { $match: { taskId, isRunning: false } },
    {
      $group: {
        _id: null,
        totalDuration: { $sum: '$duration' },
        entriesCount: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
        firstEntry: { $min: '$startTime' },
        lastEntry: { $max: '$endTime' }
      }
    }
  ]);
};

timeEntrySchema.statics.findFailedSyncs = function(retryable: boolean = true) {
  const query: any = {
    isSynced: false,
    isRunning: false,
    syncError: { $exists: true }
  };
  
  if (retryable) {
    // Only get entries that can be retried (older than 5 minutes)
    const retryThreshold = new Date(Date.now() - 5 * 60 * 1000);
    query.$or = [
      { lastSyncAttempt: { $lt: retryThreshold } },
      { lastSyncAttempt: { $exists: false } }
    ];
  }
  
  return this.find(query)
    .populate('taskId', 'title perfexTaskId')
    .sort({ lastSyncAttempt: 1 });
};

// Virtual for formatted duration
timeEntrySchema.virtual('formattedDuration').get(function() {
  const duration = this.isRunning ? this.getCurrentDuration() : (this.duration || 0);
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return `${hours}h ${minutes}m`;
});

// Virtual for entry status
timeEntrySchema.virtual('status').get(function() {
  if (this.isRunning) return 'running';
  if (this.isSynced) return 'synced';
  if (this.syncError) return 'error';
  return 'pending';
});

// Ensure virtual fields are serialized
timeEntrySchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    const { _id, __v, ...cleanRet } = ret;
    cleanRet.id = _id.toHexString();
    return cleanRet;
  }
});

// Interface for static methods
interface ITimeEntryModel extends Model<ITimeEntry> {
  findRunningTimer(userId: Types.ObjectId): Promise<ITimeEntry | null>;
  findByUserId(userId: Types.ObjectId, options?: any): Promise<ITimeEntry[]>;
  findByTaskId(taskId: Types.ObjectId, options?: any): Promise<ITimeEntry[]>;
  findUnsyncedEntries(limit?: number): Promise<ITimeEntry[]>;
  getTimeStats(userId: Types.ObjectId, dateRange?: { start: Date; end: Date }): Promise<any[]>;
  getDailyStats(userId: Types.ObjectId, days?: number): Promise<any[]>;
  getTaskTimeStats(taskId: Types.ObjectId): Promise<any[]>;
  findFailedSyncs(retryable?: boolean): Promise<ITimeEntry[]>;
}

// Create and export the model
const TimeEntry = mongoose.model<ITimeEntry, ITimeEntryModel>('TimeEntry', timeEntrySchema);

export default TimeEntry;