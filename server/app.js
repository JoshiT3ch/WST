import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { readFileSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMessageStore } from './message-store.js';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = resolve(projectRoot, 'finds-static');
const products = JSON.parse(readFileSync(new URL('./data/products.json', import.meta.url), 'utf8'));
const audiences = ['Woman', 'Men', 'Kids'];
const topics = ['buying', 'selling', 'listing', 'account', 'feedback', 'general', 'other'];

export function createApp({ dataDir = resolve(projectRoot, process.env.DATA_DIR || '.data'), contactLimit = 5 } = {}) {
  const storagePath = resolve(dataDir);
  const fromPublic = relative(publicRoot, storagePath);
  if (!fromPublic || !(fromPublic === '..' || fromPublic.startsWith(`..${sep}`) || isAbsolute(fromPublic))) {
    throw new Error('DATA_DIR must be outside finds-static so messages stay private.');
  }
  const messages = createMessageStore(storagePath);
  const app = express();
  app.disable('x-powered-by');
  // HTTP localhost development must not be upgraded to HTTPS by CSP.
  app.use(helmet({
    contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null } },
    strictTransportSecurity: false
  }));
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/products', (req, res) => {
    const { q = '', audience = 'All' } = req.query;
    if (typeof q !== 'string' || q.length > 100 || typeof audience !== 'string' || !['All', ...audiences].includes(audience)) {
      return res.status(400).json({ error: 'Use a search of at most 100 characters and audience All, Woman, Men, or Kids.' });
    }
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const results = products.filter(product => {
      const text = [product.title, product.category, product.description, product.size, product.condition, ...product.audiences].join(' ').toLowerCase();
      return (audience === 'All' || product.audiences.includes(audience)) && terms.every(term => text.includes(term));
    });
    res.json({ products: results, total: results.length });
  });
  app.get('/api/products/:id', (req, res) => {
    const product = products.find(item => item.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Find not found.' });
    res.json({ product });
  });

  app.post('/api/contact', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: contactLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many messages. Please try again in 15 minutes.' }
  }), (req, res, next) => {
    const origin = req.get('origin');
    if (origin) {
      try {
        if (new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Submit messages from this website.' });
      } catch {
        return res.status(403).json({ error: 'Invalid request origin.' });
      }
    }
    if (!req.is('application/json')) return res.status(415).json({ error: 'Send the message as application/json.' });
    next();
  }, express.json({ limit: '16kb' }), async (req, res) => {
    const body = req.body;
    if (!body || Array.isArray(body) || typeof body !== 'object') {
      return res.status(400).json({ error: 'Please provide your contact details.' });
    }
    const fields = {};
    for (const key of ['name', 'email', 'topic', 'message']) {
      if (typeof body[key] !== 'string') return res.status(400).json({ error: 'All contact fields are required.' });
      fields[key] = body[key].trim();
    }
    if (!fields.name || fields.name.length > 80 || fields.email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email) || !topics.includes(fields.topic) || fields.message.length < 10 || fields.message.length > 2000) {
      return res.status(400).json({ error: 'Enter a name (1–80 characters), valid email, topic, and message (10–2000 characters).' });
    }
    const record = await messages.save(fields);
    res.status(201).json({ id: record.id, message: 'Your message has been received.', createdAt: record.createdAt });
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
  app.use(express.static(publicRoot, { dotfiles: 'deny', index: 'index.html' }));
  app.use((_req, res) => res.status(404).type('text').send('Page not found.'));
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Message is too large.' });
    console.error('Request failed:', error.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}
