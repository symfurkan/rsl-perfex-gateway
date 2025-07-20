import mongoose from 'mongoose';
import { FastifyInstance } from 'fastify';

interface DatabaseConfig {
  uri: string;
  options?: mongoose.ConnectOptions;
}

// Load environment variables
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_HOST = process.env.MONGODB_HOST || 'localhost';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'rsl-perfex-gateway';
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;

// Build connection URI if not provided directly
function buildMongoUri(): string {
  if (MONGODB_URI) {
    return MONGODB_URI;
  }
  
  const auth = MONGODB_USERNAME && MONGODB_PASSWORD 
    ? `${MONGODB_USERNAME}:${MONGODB_PASSWORD}@` 
    : '';
  
  return `mongodb://${auth}${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
}

const DEFAULT_CONFIG: DatabaseConfig = {
  uri: buildMongoUri(),
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4, // Use IPv4, skip trying IPv6
    retryWrites: true,
    retryReads: true,
  }
};

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected = false;
  private config: DatabaseConfig;

  private constructor(config: DatabaseConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.setupEventListeners();
  }

  public static getInstance(config?: DatabaseConfig): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection(config);
    }
    return DatabaseConnection.instance;
  }

  private setupEventListeners(): void {
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
      this.isConnected = false;
    });

    // Graceful exit
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  public async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        console.log('📡 Database already connected');
        return;
      }

      console.log('🔌 Connecting to MongoDB...');
      await mongoose.connect(this.config.uri, this.config.options);
      this.isConnected = true;
    } catch (error) {
      console.error('💥 Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (!this.isConnected) {
        return;
      }

      console.log('🔌 Disconnecting from MongoDB...');
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('✅ MongoDB disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnection(): mongoose.Connection {
    return mongoose.connection;
  }

  public isConnectionReady(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public async healthCheck(): Promise<{ status: string; database: string; readyState: number }> {
    const connection = this.getConnection();
    
    return {
      status: this.isConnectionReady() ? 'connected' : 'disconnected',
      database: connection.db?.databaseName || 'unknown',
      readyState: connection.readyState
    };
  }
}

// Fastify plugin for database integration
export async function databasePlugin(fastify: FastifyInstance): Promise<void> {
  const db = DatabaseConnection.getInstance();
  
  // Connect to database
  await db.connect();
  
  // Add database instance to Fastify
  fastify.decorate('db', db);
  
  // Health check route
  fastify.get('/health/database', async (_, reply) => {
    const health = await db.healthCheck();
    
    if (health.status === 'connected') {
      return reply.code(200).send(health);
    } else {
      return reply.code(503).send(health);
    }
  });
  
  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await db.disconnect();
  });
}

// Export singleton instance
export const database = DatabaseConnection.getInstance();

// Type declaration for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    db: DatabaseConnection;
  }
}