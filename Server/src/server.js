import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.port, () => {
  console.log(`\n  Inventory Management System API`);
  console.log(`  ---------------------------------`);
  console.log(`  Environment : ${env.nodeEnv}`);
  console.log(`  Listening   : http://localhost:${env.port}`);
  console.log(`  Health      : http://localhost:${env.port}/api/health`);
  console.log(`  CORS origin : ${env.corsOrigins.join(', ')}\n`);
});

process.on('unhandledRejection', (err) => {
  console.error('[fatal] Unhandled rejection:', err);
});
