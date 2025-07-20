import Fastify from 'fastify';
import { config } from 'dotenv';
import { databasePlugin } from './utils/database.js';

// Load environment variables
config();

const app = Fastify({
  logger: true
});

// Register database plugin
app.register(databasePlugin);

// Health check route
app.get('/health', async () => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'rsl-perfex-gateway-backend'
  };
});

// API routes placeholder
app.get('/api/status', async () => {
  const dbHealth = await app.db.healthCheck();
  return {
    api: 'ok',
    database: dbHealth,
    timestamp: new Date().toISOString()
  };
});

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    app.log.info('🚀 Backend server started on http://localhost:3000');
    app.log.info('📊 Health check: http://localhost:3000/health');
    app.log.info('🔍 API status: http://localhost:3000/api/status');
    app.log.info('💾 Database health: http://localhost:3000/health/database');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();