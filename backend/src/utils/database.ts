import mongoose from 'mongoose';
import { config } from 'dotenv';

// Load environment variables
config();

interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

// Database configuration
const getDatabaseConfig = (): DatabaseConfig => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rsl-perfex-gateway';
  
  const options: mongoose.ConnectOptions = {
    // Connection pool settings
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    
    // Retry settings
    retryWrites: true,
    retryReads: true
  };

  return { uri, options };
};

// Connect to MongoDB
export const connectToDatabase = async (): Promise<void> => {
  try {
    const { uri, options } = getDatabaseConfig();
    
    // Set mongoose options
    mongoose.set('strictQuery', false);
    
    // Connect to MongoDB
    await mongoose.connect(uri, options);
    
    console.log('✅ Connected to MongoDB successfully');
    console.log(`📍 Database: ${mongoose.connection.name}`);
    console.log(`🔗 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
    
    // Connection event listeners
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });
    
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
};

// Check database health
export const checkDatabaseHealth = async (): Promise<{
  connected: boolean;
  readyState: number;
  name: string;
  host: string;
  port: number;
}> => {
  const connection = mongoose.connection;
  
  // Test connection with a simple ping
  try {
    await mongoose.connection.db?.admin().ping();
  } catch (error) {
    throw new Error(`Database ping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    connected: connection.readyState === 1,
    readyState: connection.readyState,
    name: connection.name || 'unknown',
    host: connection.host || 'unknown',
    port: connection.port || 0
  };
};

// Disconnect from database
export const disconnectFromDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
    throw error;
  }
};

// Get connection status
export const getConnectionStatus = (): string => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return states[mongoose.connection.readyState as keyof typeof states] || 'unknown';
};

// Initialize database indexes (called after model registration)
export const initializeIndexes = async (): Promise<void> => {
  try {
    // Get all models and ensure indexes
    const models = mongoose.modelNames();
    
    for (const modelName of models) {
      const model = mongoose.model(modelName);
      await model.ensureIndexes();
      console.log(`✅ Indexes ensured for ${modelName}`);
    }
    
    console.log('✅ All database indexes initialized');
  } catch (error) {
    console.error('❌ Failed to initialize indexes:', error);
    throw error;
  }
};