import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { authRouter } from './server/routes/auth.ts';
import { specialistRouter } from './server/routes/specialist.ts';
import { managerRouter } from './server/routes/manager.ts';
import { getCairoTodayDate, getCairoCurrentTime, formatCairoArabicDate } from './server/time.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Health and Cairo time endpoint
  app.get('/api/time', (req, res) => {
    const today = getCairoTodayDate();
    const time = getCairoCurrentTime();
    res.json({
      today,
      time,
      todayFormatted: formatCairoArabicDate(today),
      timezone: 'Africa/Cairo',
    });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/specialist', specialistRouter);
  app.use('/api/manager', managerRouter);

  // Vite integration
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Speech Therapy Specialist Management System is running on http://0.0.0.0:${PORT}`);
    console.log(`📍 Timezone: Africa/Cairo (${getCairoTodayDate()} ${getCairoCurrentTime()})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
