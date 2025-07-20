import mongoose, { Schema, Model, Types } from 'mongoose';
import { ILocalTask, TaskAssignee } from '../types/models.js';

// Task assignee schema
const taskAssigneeSchema = new Schema<TaskAssignee>({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Optional field
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  }
}, { _id: false });

// Project schema
const projectSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

// LocalTask schema
const localTaskSchema = new Schema<ILocalTask>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  perfexTaskId: {
    type: String,
    required: [true, 'Perfex Task ID is required'],
    trim: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [500, 'Title cannot exceed 500 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  status: {
    type: String,
    required: [true, 'Task status is required'],
    enum: {
      values: ['Not Started', 'In Progress', 'Testing', 'Awaiting Feedback', 'Complete', 'Cancelled'],
      message: 'Invalid task status'
    },
    default: 'Not Started',
    index: true
  },
  priority: {
    type: String,
    required: [true, 'Task priority is required'],
    enum: {
      values: ['Low', 'Medium', 'High', 'Urgent'],
      message: 'Invalid task priority'
    },
    default: 'Medium',
    index: true
  },
  assignees: {
    type: [taskAssigneeSchema],
    default: [],
    validate: {
      validator: function(v: TaskAssignee[]) {
        return v.length >= 0; // Can be empty
      },
      message: 'Assignees must be a valid array'
    }
  },
  startDate: {
    type: Date,
    index: true
  },
  dueDate: {
    type: Date,
    index: true,
    validate: {
      validator: function(this: ILocalTask, value: Date) {
        if (!value || !this.startDate) return true;
        return value >= this.startDate;
      },
      message: 'Due date must be after start date'
    }
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative'],
    max: [9999, 'Estimated hours cannot exceed 9999']
  },
  totalLoggedTime: {
    type: Number,
    default: 0,
    min: [0, 'Total logged time cannot be negative']
  },
  lastSynced: {
    type: Date,
    required: [true, 'Last synced date is required'],
    default: Date.now,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(v: string[]) {
        return v.every(tag => tag.trim().length > 0 && tag.length <= 50);
      },
      message: 'Each tag must be between 1 and 50 characters'
    }
  },
  project: {
    type: projectSchema,
    default: null
  }
}, {
  timestamps: true,
  versionKey: false,
  collection: 'local_tasks'
});

// Compound indexes for performance
localTaskSchema.index({ userId: 1, isActive: 1 });
localTaskSchema.index({ userId: 1, status: 1 });
localTaskSchema.index({ userId: 1, priority: 1 });
localTaskSchema.index({ userId: 1, perfexTaskId: 1 }, { unique: true });
localTaskSchema.index({ userId: 1, dueDate: 1 });
localTaskSchema.index({ userId: 1, lastSynced: 1 });
localTaskSchema.index({ status: 1, priority: 1 });
localTaskSchema.index({ tags: 1 });
localTaskSchema.index({ 'project.id': 1 });

// Text index for search functionality
localTaskSchema.index({ 
  title: 'text', 
  description: 'text',
  tags: 'text'
});

// Pre-save middleware
localTaskSchema.pre('save', function(next) {
  // Trim and clean tags
  if (this.isModified('tags') && this.tags) {
    this.tags = this.tags
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .filter((tag, index, arr) => arr.indexOf(tag) === index); // Remove duplicates
  }
  
  // Update lastSynced if perfex-related fields are modified
  if (this.isModified(['status', 'priority', 'assignees', 'title', 'description'])) {
    // Only update lastSynced if it's not already being explicitly set
    if (!this.isModified('lastSynced')) {
      this.lastSynced = new Date();
    }
  }
  
  next();
});

// Instance methods
localTaskSchema.methods.markAsSynced = function(): Promise<ILocalTask> {
  this.lastSynced = new Date();
  return this.save();
};

localTaskSchema.methods.updateProgress = function(status: string, totalLoggedTime?: number): Promise<ILocalTask> {
  this.status = status;
  if (totalLoggedTime !== undefined) {
    this.totalLoggedTime = totalLoggedTime;
  }
  return this.save();
};

localTaskSchema.methods.addTimeLog = function(minutes: number): Promise<ILocalTask> {
  this.totalLoggedTime = (this.totalLoggedTime || 0) + minutes;
  return this.save();
};

localTaskSchema.methods.updateFromPerfex = function(perfexData: any): Promise<ILocalTask> {
  this.title = perfexData.name || this.title;
  this.description = perfexData.description || this.description;
  this.status = perfexData.status || this.status;
  this.priority = perfexData.priority || this.priority;
  
  if (perfexData.assignees) {
    this.assignees = perfexData.assignees;
  }
  
  if (perfexData.startdate) {
    this.startDate = new Date(perfexData.startdate);
  }
  
  if (perfexData.duedate) {
    this.dueDate = new Date(perfexData.duedate);
  }
  
  if (perfexData.project) {
    this.project = perfexData.project;
  }
  
  this.lastSynced = new Date();
  return this.save();
};

localTaskSchema.methods.isOverdue = function(): boolean {
  if (!this.dueDate) return false;
  return this.dueDate < new Date() && this.status !== 'Complete';
};

localTaskSchema.methods.getDaysUntilDue = function(): number | null {
  if (!this.dueDate) return null;
  const now = new Date();
  const diffTime = this.dueDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

localTaskSchema.methods.deactivate = function(): Promise<ILocalTask> {
  this.isActive = false;
  return this.save();
};

// Static methods
localTaskSchema.statics.findByUserId = function(userId: Types.ObjectId, options: any = {}) {
  const query: any = { userId, isActive: true };
  
  if (options.status) query.status = options.status;
  if (options.priority) query.priority = options.priority;
  if (options.perfexTaskId) query.perfexTaskId = options.perfexTaskId;
  
  return this.find(query)
    .sort(options.sort || { dueDate: 1, priority: -1, createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

localTaskSchema.statics.findOverdueTasks = function(userId?: Types.ObjectId) {
  const query: any = {
    isActive: true,
    dueDate: { $lt: new Date() },
    status: { $ne: 'Complete' }
  };
  
  if (userId) query.userId = userId;
  
  return this.find(query).sort({ dueDate: 1 });
};

localTaskSchema.statics.findTasksNeedingSync = function(olderThanMinutes: number = 30) {
  const threshold = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  return this.find({
    isActive: true,
    lastSynced: { $lt: threshold }
  }).limit(100);
};

localTaskSchema.statics.searchTasks = function(userId: Types.ObjectId, searchTerm: string, options: any = {}) {
  const query: any = {
    userId,
    isActive: true,
    $text: { $search: searchTerm }
  };
  
  if (options.status) query.status = options.status;
  if (options.priority) query.priority = options.priority;
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20);
};

localTaskSchema.statics.getTaskStats = function(userId: Types.ObjectId) {
  return this.aggregate([
    { $match: { userId, isActive: true } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalLoggedTime: { $sum: '$totalLoggedTime' }
      }
    }
  ]);
};

localTaskSchema.statics.findByProject = function(userId: Types.ObjectId, projectId: string) {
  return this.find({
    userId,
    isActive: true,
    'project.id': projectId
  }).sort({ dueDate: 1, priority: -1 });
};

// Virtual for progress percentage
localTaskSchema.virtual('progressPercentage').get(function() {
  const statusMap = {
    'Not Started': 0,
    'In Progress': 25,
    'Testing': 75,
    'Awaiting Feedback': 90,
    'Complete': 100,
    'Cancelled': 0
  };
  return statusMap[this.status as keyof typeof statusMap] || 0;
});

// Virtual for time efficiency
localTaskSchema.virtual('timeEfficiency').get(function() {
  if (!this.estimatedHours || this.estimatedHours === 0) return null;
  const loggedHours = (this.totalLoggedTime || 0) / 60;
  return Math.round((this.estimatedHours / loggedHours) * 100);
});

// Ensure virtual fields are serialized
localTaskSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    const { _id, __v, ...cleanRet } = ret;
    cleanRet.id = _id.toHexString();
    return cleanRet;
  }
});

// Interface for static methods
interface ILocalTaskModel extends Model<ILocalTask> {
  findByUserId(userId: Types.ObjectId, options?: any): Promise<ILocalTask[]>;
  findOverdueTasks(userId?: Types.ObjectId): Promise<ILocalTask[]>;
  findTasksNeedingSync(olderThanMinutes?: number): Promise<ILocalTask[]>;
  searchTasks(userId: Types.ObjectId, searchTerm: string, options?: any): Promise<ILocalTask[]>;
  getTaskStats(userId: Types.ObjectId): Promise<any[]>;
  findByProject(userId: Types.ObjectId, projectId: string): Promise<ILocalTask[]>;
}

// Create and export the model
const LocalTask = mongoose.model<ILocalTask, ILocalTaskModel>('LocalTask', localTaskSchema);

export default LocalTask;