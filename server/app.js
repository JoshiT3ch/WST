
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { createMessageStore } from './message-store.js';
import { createProductStore } from './product-store.js';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = resolve(projectRoot, 'finds-static');
const uploadRoot = resolve(publicRoot, 'uploads');
const products = JSON.parse(
  readFileSync(new URL('./data/products.json', import.meta.url), 'utf8')
);

const audiences = ['Woman', 'Men', 'Kids'];
const topics = ['buying', 'selling', 'listing', 'account', 'feedback', 'general', 'other'];
const productCategories = ['Clothing', 'Shoes', 'Accessories', 'Bags', 'Home', 'Kids', 'Other'];
const productConditions = ['New', 'Like new', 'Good', 'Fair'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      const error = new Error('Upload a JPG, PNG, or WebP image only.');
      error.status = 400;
      return callback(error);
    }
    callback(null, true);
  }
});

function getImageExtension(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff &&
      buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';

  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  )) return 'png';

  if (buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';

  return null;
}

function validateProduct(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const category = typeof body.category === 'string' ? body.category : '';
  const size = typeof body.size === 'string' ? body.size.trim() : '';
  const condition = typeof body.condition === 'string' ? body.condition : '';
  const price = typeof body.price === 'string' || typeof body.price === 'number'
    ? Number(body.price)
    : Number.NaN;

  const submittedAudiences = Array.isArray(body.audiences)
    ? body.audiences
    : typeof body.audiences === 'string'
      ? [body.audiences]
      : [];

  const validAudiences =
    submittedAudiences.length >= 1 &&
    submittedAudiences.length <= audiences.length &&
    submittedAudiences.every(value => audiences.includes(value)) &&
    new Set(submittedAudiences).size === submittedAudiences.length;

  if (
    !title || title.length > 100 ||
    description.length < 10 || description.length > 1000 ||
    !productCategories.includes(category) ||
    !Number.isFinite(price) || !Number.isInteger(price) ||
    price < 1 || price > 10000000 ||
    !size || size.length > 40 ||
    !productConditions.includes(condition) ||
    !validAudiences
  ) {
    return {
      error: 'Enter a valid title, description, category, whole-number price, size, condition, and at least one audience.'
    };
  }

  return {
    product: {
      title, description, category, price, size, condition,
      audiences: submittedAudiences
    }
  };
}

function checkSameOrigin(req, res, resource) {
  const origin = req.get('origin');

  if (!origin) return true;

  try {
    if (new URL(origin).host !== req.get('host')) {
      res.status(403).json({ error: `Submit ${resource} from this website.` });
      return false;
    }
  } catch {
    res.status(403).json({ error: 'Invalid request origin.' });
    return false;
  }

  return true;
}

export function createApp({
  dataDir = resolve(projectRoot, process.env.DATA_DIR || '.data'),
  contactLimit = 5,
  productLimit = 5
} = {}) {
  const storagePath = resolve(dataDir);
  const fromPublic = relative(publicRoot, storagePath);

  if (!fromPublic ||
      !(fromPublic === '..' || fromPublic.startsWith(`..${sep}`) || isAbsolute(fromPublic))) {
    throw new Error('DATA_DIR must be outside finds-static so application data stays private.');
  }

  const messages = createMessageStore(storagePath);
  const listings = createProductStore(storagePath);
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        'upgrade-insecure-requests': null,
        'img-src': ["'self'", 'data:', 'https:']
      }
    },
    strictTransportSecurity: false
  }));

  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

 app.get('/api/products', async (req, res, next) => {
  const {
    q = '',
    audience = 'All',
    category = 'All'
  } = req.query;

  if (
    typeof q !== 'string' ||
    q.length > 100 ||
    typeof audience !== 'string' ||
    !['All', ...audiences].includes(audience) ||
    typeof category !== 'string' ||
    !['All', ...productCategories].includes(category)
  ) {
    return res.status(400).json({
      error: 'Use a search of at most 100 characters and valid audience and category filters.'
    });
  }

    try {
      const allProducts = [...products, ...await listings.list()];
      const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const results = allProducts.filter(product => {
        const text = [
          product.title, product.category, product.description,
          product.size, product.condition, ...(product.audiences || [])
        ].join(' ').toLowerCase();

      return (
  (audience === 'All' || product.audiences.includes(audience)) &&
  (category === 'All' || product.category === category) &&
  terms.every(term => text.includes(term))
);
      });

      res.json({ products: results, total: results.length });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/products', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: productLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many listings submitted. Please try again in 15 minutes.' }
  }), (req, res, next) => {
    if (!checkSameOrigin(req, res, 'listings')) return;

    if (!req.is('multipart/form-data')) {
      return res.status(415).json({
        error: 'Upload your listing using the form and an image file.'
      });
    }

    next();
  }, upload.single('image'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please upload a photo of your item.' });
      }

      const validation = validateProduct(req.body);
      if (validation.error) {
        return res.status(400).json({ error: validation.error });
      }

      const extension = getImageExtension(req.file.buffer);
      if (!extension) {
        return res.status(400).json({
          error: 'The uploaded file is not a valid JPG, PNG, or WebP image.'
        });
      }

      await mkdir(uploadRoot, { recursive: true });

      const filename = `${randomUUID()}.${extension}`;
      await writeFile(resolve(uploadRoot, filename), req.file.buffer, { flag: 'wx' });

      const record = await listings.save({
        ...validation.product,
        currency: 'PHP',
        image: `uploads/${filename}`
      });

      res.status(201).json({
        product: record,
        message: 'Your listing has been created.'
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/products/:id', async (req, res, next) => {
    try {
      const product = products.find(item => item.id === req.params.id) ||
        (await listings.list()).find(item => item.id === req.params.id);

      if (!product) return res.status(404).json({ error: 'Find not found.' });
      res.json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/contact', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: contactLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many messages. Please try again in 15 minutes.' }
  }), (req, res, next) => {
    if (!checkSameOrigin(req, res, 'messages')) return;

    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'Send the message as application/json.' });
    }

    next();
  }, express.json({ limit: '16kb' }), async (req, res, next) => {
    try {
      const body = req.body;

      if (!body || Array.isArray(body) || typeof body !== 'object') {
        return res.status(400).json({ error: 'Please provide your contact details.' });
      }

      const fields = {};
      for (const key of ['name', 'email', 'topic', 'message']) {
        if (typeof body[key] !== 'string') {
          return res.status(400).json({ error: 'All contact fields are required.' });
        }
        fields[key] = body[key].trim();
      }

      if (
        !fields.name || fields.name.length > 80 ||
        fields.email.length > 120 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email) ||
        !topics.includes(fields.topic) ||
        fields.message.length < 10 || fields.message.length > 2000
      ) {
        return res.status(400).json({
          error: 'Enter a name (1–80 characters), valid email, topic, and message (10–2000 characters).'
        });
      }

      const record = await messages.save(fields);
      res.status(201).json({
        id: record.id,
        message: 'Your message has been received.',
        createdAt: record.createdAt
      });
    } catch (error) {
      next(error);
    }
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  app.use(express.static(publicRoot, {
    dotfiles: 'deny',
    index: 'index.html'
  }));

  app.use((_req, res) => res.status(404).type('text').send('Page not found.'));

  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON.' });
    }

    if (error.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body is too large.' });
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'Your photo exceeds the 5 MB limit. Please choose a smaller image.'
        });
      }

      return res.status(400).json({ error: 'Please upload one valid image file.' });
    }

    if (error.status && error.status < 500) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error('Request failed:', error.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  return app;
}
