import Fastify from 'fastify';

const app = Fastify({
  logger: true
});

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    app.log.info('Backend server started on http://localhost:3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();