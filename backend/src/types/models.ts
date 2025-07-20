import { Document, Types } from 'mongoose';

// Base document interface
export interface BaseDocument extends Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// User related interfaces
export interface EncryptedCredentials {
  email: string;
  password: string; // AES-256-GCM encrypted
  encryptionKey: string; // User-specific encryption key
}

export interface IUser extends BaseDocument {
  email: string;
  passwordHash: string; // bcrypt hashed
  perfexCredentials: EncryptedCredentials;
  isActive: boolean;
  lastLoginAt?: Date;
  
  // Instance methods
  updateLastLogin(): Promise<IUser>;
  deactivate(): Promise<IUser>;
  activate(): Promise<IUser>;
}

// Perfex Session interfaces
export interface IPerfexSession extends BaseDocument {
  userId: Types.ObjectId;
  sessionCookie: string; // sp_session value from Perfex
  expiresAt: Date;
  lastUsed: Date;
  isActive: boolean;
  perfexUrl?: string; // Optional: different Perfex instances
  
  // Instance methods
  isExpired(): boolean;
  isValid(): boolean;
  refresh(newExpirationDate?: Date): Promise<IPerfexSession>;
  deactivate(): Promise<IPerfexSession>;
  extend(hoursToAdd?: number): Promise<IPerfexSession>;
}

// Task related interfaces
export interface TaskAssignee {
  id: string;
  name: string;
  email?: string;
}

export interface ILocalTask extends BaseDocument {
  userId: Types.ObjectId;
  perfexTaskId: string; // Task ID from Perfex CRM
  title: string;
  description?: string;
  status: string; // e.g., 'Not Started', 'In Progress', 'Testing', 'Awaiting Feedback', 'Complete'
  priority: string; // e.g., 'Low', 'Medium', 'High', 'Urgent'
  assignees: TaskAssignee[];
  startDate?: Date;
  dueDate?: Date;
  estimatedHours?: number;
  totalLoggedTime?: number; // in minutes
  lastSynced: Date;
  isActive: boolean;
  tags?: string[];
  project?: {
    id: string;
    name: string;
  };
  
  // Virtual properties
  progressPercentage: number;
  timeEfficiency: number | null;
  
  // Instance methods
  markAsSynced(): Promise<ILocalTask>;
  updateProgress(status: string, totalLoggedTime?: number): Promise<ILocalTask>;
  addTimeLog(minutes: number): Promise<ILocalTask>;
  updateFromPerfex(perfexData: any): Promise<ILocalTask>;
  isOverdue(): boolean;
  getDaysUntilDue(): number | null;
  deactivate(): Promise<ILocalTask>;
}

// Time Entry interfaces
export interface ITimeEntry extends BaseDocument {
  userId: Types.ObjectId;
  taskId: Types.ObjectId; // Reference to LocalTask
  perfexTaskId: string; // Task ID from Perfex
  perfexTimerId?: string; // Timer ID from Perfex (when synced)
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  notes?: string;
  isRunning: boolean;
  isSynced: boolean;
  syncedAt?: Date;
  lastSyncAttempt?: Date;
  syncError?: string | null;
  
  // Virtual properties
  formattedDuration: string;
  status: string;
  
  // Instance methods
  stop(notes?: string): Promise<ITimeEntry>;
  markAsSynced(perfexTimerId?: string): Promise<ITimeEntry>;
  markSyncError(error: string): Promise<ITimeEntry>;
  getCurrentDuration(): number;
  updateNotes(notes: string): Promise<ITimeEntry>;
  retrySyncAfter(minutes?: number): boolean;
}

// DTOs for API responses
export interface UserResponseDto {
  id: string;
  email: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskResponseDto {
  id: string;
  perfexTaskId: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignees: TaskAssignee[];
  startDate?: Date;
  dueDate?: Date;
  estimatedHours?: number;
  totalLoggedTime?: number;
  lastSynced: Date;
  isActive: boolean;
  tags?: string[];
  project?: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeEntryResponseDto {
  id: string;
  taskId: string;
  perfexTaskId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  notes?: string;
  isRunning: boolean;
  isSynced: boolean;
  syncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PerfexSessionResponseDto {
  id: string;
  userId: string;
  expiresAt: Date;
  lastUsed: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Request DTOs
export interface CreateUserDto {
  email: string;
  password: string;
  perfexCredentials: {
    email: string;
    password: string;
  };
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UpdateUserDto {
  email?: string;
  perfexCredentials?: {
    email: string;
    password: string;
  };
}

export interface CreateTimeEntryDto {
  taskId: string;
  notes?: string;
}

export interface UpdateTimeEntryDto {
  endTime?: Date;
  notes?: string;
}

// Perfex API response types
export interface PerfexLoginResponse {
  success: boolean;
  sessionCookie?: string;
  error?: string;
}

export interface PerfexTaskData {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  assignees: string[];
  startdate?: string;
  duedate?: string;
  project?: {
    id: string;
    name: string;
  };
}

export interface PerfexTimerResponse {
  success: boolean;
  timerId?: string;
  taskId: string;
  error?: string;
  html?: string;
}

// Database query filters
export interface TaskFilters {
  userId?: Types.ObjectId;
  status?: string;
  priority?: string;
  isActive?: boolean;
  startDate?: {
    $gte?: Date;
    $lte?: Date;
  };
  dueDate?: {
    $gte?: Date;
    $lte?: Date;
  };
}

export interface TimeEntryFilters {
  userId?: Types.ObjectId;
  taskId?: Types.ObjectId;
  isRunning?: boolean;
  isSynced?: boolean;
  startTime?: {
    $gte?: Date;
    $lte?: Date;
  };
}