import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import env from '@fastify/env';
import { connectToDatabase, checkDatabaseHealth } from './utils/database.js';
import authRoutes from './routes/auth.routes.js';
import tasksRoutes from './routes/tasks.routes.js';
import profileRoutes from './routes/profile.routes.js';

// Environment schema for validation
const envSchema = {
  type: 'object',
  required: ['NODE_ENV'],
  properties: {
    NODE_ENV: {
      type: 'string',
      default: 'development'
    },
    PORT: {
      type: 'string',
      default: '3000'
    },
    HOST: {
      type: 'string',
      default: '0.0.0.0'
    },
    MONGODB_URI: {
      type: 'string',
      default: 'mongodb://localhost:27017/rsl-perfex-gateway'
    },
    JWT_SECRET: {
      type: 'string'
    },
    ENCRYPTION_KEY: {
      type: 'string'
    }
  }
};

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info'
  }
});

// Environment variables validation
await app.register(env, {
  schema: envSchema,
  dotenv: true
});

// Security middleware
await app.register(helmet);

// CORS configuration
await app.register(cors, {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : true,
  credentials: true
});

// Rate limiting
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// Database connection
try {
  await connectToDatabase();
  app.log.info('Connected to MongoDB successfully');
} catch (error) {
  app.log.error('Failed to connect to MongoDB:', error);
  process.exit(1);
}

// Health check routes
app.get('/health', async () => {
  return { 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
});

app.get('/health/database', async (_, reply) => {
  try {
    const dbStatus = await checkDatabaseHealth();
    return {
      status: 'healthy',
      database: dbStatus,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    reply.code(503);
    return {
      status: 'unhealthy',
      database: { connected: false, error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date().toISOString()
    };
  }
});

app.get('/api/status', async (_, reply) => {
  try {
    const dbStatus = await checkDatabaseHealth();
    return {
      api: {
        status: 'operational',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      database: dbStatus,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    reply.code(503);
    return {
      api: {
        status: 'degraded',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      database: { connected: false, error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date().toISOString()
    };
  }
});

// Register routes
await app.register(authRoutes);
await app.register(tasksRoutes);
await app.register(profileRoutes);

// Global error handler
app.setErrorHandler((error, _, reply) => {
  app.log.error(error);
  
  // Don't leak error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  reply.code(error.statusCode || 500).send({
    error: true,
    message: isProduction ? 'Internal Server Error' : error.message,
    statusCode: error.statusCode || 500,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.setNotFoundHandler((_, reply) => {
  reply.code(404).send({
    error: true,
    message: 'Route not found',
    statusCode: 404,
    timestamp: new Date().toISOString()
  });
});

const start = async (): Promise<void> => {
  try {
    const port = Number(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    app.log.info(`Backend server started on http://${host}:${port}`);
    app.log.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    app.log.info(`Health check available at: http://${host}:${port}/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    await app.close();
    app.log.info('Server closed successfully');
    process.exit(0);
  } catch (err) {
    app.log.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Only start if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { app };