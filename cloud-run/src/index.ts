import express from 'express';
import cors from 'cors';
import loadKundliSheet from './routes/load-kundli-sheet';
import startKundliJob from './routes/start-kundli-job';
import processKundliJob from './routes/process-kundli-job';
import translateKundliReport from './routes/translate-kundli-report';
import finalizeKundliReport from './routes/finalize-kundli-report';
import getKundliJob from './routes/get-kundli-job';
import getKundliJobEvents from './routes/get-kundli-job-events';
import decipherKundliInput from './routes/decipher-kundli-input';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/load-kundli-sheet', loadKundliSheet);
app.use('/start-kundli-job', startKundliJob);
app.use('/process-kundli-job', processKundliJob);
app.use('/translate-kundli-report', translateKundliReport);
app.use('/finalize-kundli-report', finalizeKundliReport);
app.use('/get-kundli-job', getKundliJob);
app.use('/get-kundli-job-events', getKundliJobEvents);
app.use('/decipher-kundli-input', decipherKundliInput);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Gemini connectivity test
app.get('/test-gemini', async (_req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });
    const url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const start = Date.now();
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gemini-2.5-flash', messages: [{ role: 'user', content: 'Say hello in Tamil, one word only' }] }),
    });
    const elapsed = Date.now() - start;
    const data = await resp.json();
    if (!resp.ok) return res.json({ ok: false, elapsed, status: resp.status, error: data });
    const msg = (data as any).choices?.[0]?.message?.content || '';
    res.json({ ok: true, elapsed, message: msg });
  } catch (err: any) {
    res.json({ ok: false, error: err.message, type: err.constructor?.name });
  }
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Kundli API running on port ${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   POST /load-kundli-sheet`);
  console.log(`   POST /start-kundli-job`);
  console.log(`   POST /process-kundli-job`);
  console.log(`   POST /translate-kundli-report`);
  console.log(`   POST /finalize-kundli-report`);
  console.log(`   GET  /get-kundli-job`);
  console.log(`   GET  /get-kundli-job-events`);
  console.log(`   POST /decipher-kundli-input`);
  console.log(`   GET  /health`);
});
