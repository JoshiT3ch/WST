
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { createApp } from '../server/app.js';

const sample = {
  name: ' Alex Santos ',
  email: ' alex@example.com ',
  topic: 'general',
  message: ' How does Finds work? '
};

const listingSample = {
  title: ' Linen summer shirt ',
  description: ' A lightweight shirt for warm sunny days. ',
  category: 'Clothing',
  audiences: ['Woman', 'Men'],
  price: 425,
  size: 'Medium',
  condition: 'Like new',
  image: 'images/products/shirt.svg'
};

const json = body => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

// A small PNG file used to test product image uploads.
const testPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6l8AAAAASUVORK5CYII=',
  'base64'
);

// Build a multipart/form-data request like the actual SellForm.
function productForm(body = listingSample, includeImage = true) {
  const form = new FormData();

  for (const [key, value] of Object.entries(body)) {
    if (
      key === 'image' ||
      value === undefined ||
      value === null
    ) {
      continue;
    }

    if (key === 'audiences' && Array.isArray(value)) {
      value.forEach(audience => {
        form.append('audiences', audience);
      });
    } else {
      form.append(key, String(value));
    }
  }

  if (includeImage) {
    form.append(
      'image',
      new Blob([testPng], { type: 'image/png' }),
      'test.png'
    );
  }

  return form;
}

const multipart = (body = listingSample, includeImage = true) => ({
  method: 'POST',
  body: productForm(body, includeImage)
});

async function fixture(t, options = {}) {
  const dataDir = await mkdtemp(join(tmpdir(), 'finds-test-'));
  const server = createApp({ dataDir, ...options }).listen(0, '127.0.0.1');

  await once(server, 'listening');

  t.after(async () => {
    await new Promise((resolveClose, reject) => {
      server.close(error => {
        if (error) reject(error);
        else resolveClose();
      });
    });

    await rm(dataDir, { recursive: true, force: true });
  });

  const url = `http://127.0.0.1:${server.address().port}`;

  return {
    dataDir,
    server,
    request: (path, init) => fetch(`${url}${path}`, init)
  };
}

test('serves all website pages and assets, without exposing backend files', async t => {
  const { request } = await fixture(t);

  for (const path of [
    '/',
    '/about.html',
    '/contact.html',
    '/sell.html',
    '/faqs.html',
    '/how-it-works.html',
    '/css/style.css',
    '/js/app.js',
    '/images/products/jacket.svg'
  ]) {
    const response = await request(path);

    assert.equal(response.status, 200, path);
    assert.equal(
      response.headers.get('x-content-type-options'),
      'nosniff'
    );
  }

  for (const path of [
    '/server/data/products.json',
    '/package.json',
    '/.env',
    '/.data/messages.jsonl',
    '/node_modules/express/package.json'
  ]) {
    assert.equal((await request(path)).status, 404, path);
  }

  const health = await request('/api/health');

  assert.deepEqual(await health.json(), { status: 'ok' });
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.equal(health.headers.get('x-powered-by'), null);
});

test('catalogue supports combined search and audience filtering', async t => {
  const { request } = await fixture(t);

  const all = await (await request('/api/products')).json();

  assert.equal(all.total, 4);
  assert.equal(all.products[0].price, 650);

  const filtered = await (
    await request('/api/products?q=DENIM%20medium&audience=Men')
  ).json();

  assert.deepEqual(
    filtered.products.map(item => item.id),
    ['jacket']
  );

  assert.equal(filtered.total, 1);

  assert.deepEqual(
    await (
      await request('/api/products?audience=Kids')
    ).json(),
    { products: [], total: 0 }
  );

  assert.equal(
    (await (await request('/api/products?q=not-in-catalogue')).json()).total,
    0
  );

  for (const query of [
    'audience=bad',
    'q=a&q=b',
    'audience=Men&audience=Kids',
    `q=${'a'.repeat(101)}`
  ]) {
    assert.equal(
      (await request(`/api/products?${query}`)).status,
      400
    );
  }
});

test('product details match the catalogue and unknown items return JSON 404', async t => {
  const { request } = await fixture(t);

  const { product } = await (
    await request('/api/products/jacket')
  ).json();

  assert.equal(product.title, 'Vintage denim jacket');
  assert.match(product.description, /denim/);

  const response = await request('/api/products/missing');

  assert.equal(response.status, 404);
  assert.deepEqual(
    await response.json(),
    { error: 'Find not found.' }
  );

  assert.equal((await request('/api/missing')).status, 404);
});

test('creates validated product listings and returns them in catalogue and detail routes', async t => {
  const { dataDir, request } = await fixture(t);

  const response = await request(
    '/api/products',
    multipart({
      ...listingSample,
      ignored: 'not saved',
      id: 'forged'
    })
  );

  assert.equal(response.status, 201);

  const { product, message } = await response.json();

  assert.equal(message, 'Your listing has been created.');
  assert.ok(product.id);
  assert.notEqual(product.id, 'forged');
  assert.equal(product.title, 'Linen summer shirt');
  assert.equal(
    product.description,
    'A lightweight shirt for warm sunny days.'
  );
  assert.equal(product.price, 425);
  assert.equal(product.currency, 'PHP');
  assert.equal(product.ignored, undefined);
  assert.ok(product.createdAt);

  const catalogue = await (
    await request('/api/products?q=linen')
  ).json();

  assert.equal(catalogue.total, 1);
  assert.equal(catalogue.products[0].id, product.id);

  const detail = await (
    await request(`/api/products/${product.id}`)
  ).json();

  assert.equal(detail.product.title, product.title);

  const saved = JSON.parse(
    (await readFile(join(dataDir, 'products.jsonl'), 'utf8')).trim()
  );

  assert.equal(saved.id, product.id);
  assert.equal(saved.ignored, undefined);
});

test('rejects invalid product listings without saving them', async t => {
  const { dataDir, request } = await fixture(t, {
    productLimit: 100
  });

  const invalid = [
    { ...listingSample, title: '' },
    { ...listingSample, title: 'x'.repeat(101) },
    { ...listingSample, description: 'too short' },
    { ...listingSample, category: 'Unknown' },
    { ...listingSample, price: 0 },
    { ...listingSample, price: 'not-a-number' },
    { ...listingSample, size: '' },
    { ...listingSample, condition: 'Excellent-ish' },
    { ...listingSample, audiences: [] },
    { ...listingSample, audiences: ['Woman', 'Woman'] },
    { ...listingSample, audiences: ['Everyone'] }
  ];

  for (const body of invalid) {
    const response = await request(
      '/api/products',
      multipart(body)
    );

    assert.equal(response.status, 400, JSON.stringify(body));
  }

  // A request without multipart/form-data must be rejected.
  assert.equal(
    (
      await request('/api/products', {
        method: 'POST',
        body: JSON.stringify(listingSample)
      })
    ).status,
    415
  );

  // Reject a file whose contents are not a valid supported image.
  const badImageForm = productForm(listingSample, false);

  badImageForm.append(
    'image',
    new Blob(['not an image'], { type: 'image/png' }),
    'fake.png'
  );

  assert.equal(
    (
      await request('/api/products', {
        method: 'POST',
        body: badImageForm
      })
    ).status,
    400
  );

  // Reject a listing without an uploaded image.
  assert.equal(
    (
      await request(
        '/api/products',
        multipart(listingSample, false)
      )
    ).status,
    400
  );

  // Reject submissions from another website.
  const foreign = multipart(listingSample);
  foreign.headers = { Origin: 'https://other.example' };

  assert.equal(
    (await request('/api/products', foreign)).status,
    403
  );

  await assert.rejects(
    readFile(join(dataDir, 'products.jsonl')),
    { code: 'ENOENT' }
  );
});

test('created product listings survive a new app instance', async t => {
  const { dataDir, request } = await fixture(t);

  const created = await request(
    '/api/products',
    multipart(listingSample)
  );

  assert.equal(created.status, 201);

  const { product } = await created.json();

  const nextServer = createApp({ dataDir }).listen(0, '127.0.0.1');

  await once(nextServer, 'listening');

  t.after(() =>
    new Promise(resolveClose => nextServer.close(resolveClose))
  );

  const response = await fetch(
    `http://127.0.0.1:${nextServer.address().port}/api/products/${product.id}`
  );

  assert.equal(response.status, 200);

  assert.equal(
    (await response.json()).product.title,
    'Linen summer shirt'
  );
});

test('contact confirms persistence, trims fields, and ignores extra fields', async t => {
  const { dataDir, request } = await fixture(t);

  const response = await request(
    '/api/contact',
    json({ ...sample, id: 'forged', admin: true })
  );

  assert.equal(response.status, 201);

  const receipt = await response.json();

  const saved = JSON.parse(
    (await readFile(join(dataDir, 'messages.jsonl'), 'utf8')).trim()
  );

  assert.equal(saved.id, receipt.id);
  assert.notEqual(saved.id, 'forged');
  assert.equal(saved.name, 'Alex Santos');
  assert.equal(saved.email, 'alex@example.com');
  assert.equal(saved.message, 'How does Finds work?');
  assert.equal(saved.createdAt, receipt.createdAt);
  assert.equal(saved.admin, undefined);

  assert.equal((await request('/api/contact')).status, 404);
});

test('messages survive creating a new app with the same storage directory', async t => {
  const { dataDir, request } = await fixture(t);

  assert.equal(
    (await request('/api/contact', json(sample))).status,
    201
  );

  const nextServer = createApp({ dataDir }).listen(0, '127.0.0.1');

  await once(nextServer, 'listening');

  t.after(() =>
    new Promise(resolveClose => nextServer.close(resolveClose))
  );

  const response = await fetch(
    `http://127.0.0.1:${nextServer.address().port}/api/contact`,
    json({ ...sample, name: 'Second message' })
  );

  assert.equal(response.status, 201);

  const records = (
    await readFile(join(dataDir, 'messages.jsonl'), 'utf8')
  )
    .trim()
    .split('\n')
    .map(JSON.parse);

  assert.equal(records.length, 2);
  assert.equal(records[0].name, 'Alex Santos');
  assert.equal(records[1].name, 'Second message');
});

test('rejects invalid contact fields and malformed or oversized JSON without saving', async t => {
  const { dataDir, request } = await fixture(t, {
    contactLimit: 100
  });

  const invalid = [
    null,
    [],
    {},
    { ...sample, name: ' ' },
    { ...sample, name: 'a'.repeat(81) },
    { ...sample, email: 'invalid' },
    { ...sample, topic: 'unknown' },
    { ...sample, message: 'short' },
    { ...sample, message: 'a'.repeat(2001) },
    { ...sample, name: {} }
  ];

  for (const body of invalid) {
    assert.equal(
      (await request('/api/contact', json(body))).status,
      400
    );
  }

  assert.equal(
    (
      await request('/api/contact', {
        ...json(sample),
        body: '{broken'
      })
    ).status,
    400
  );

  assert.equal(
    (
      await request(
        '/api/contact',
        json({ ...sample, message: 'x'.repeat(17000) })
      )
    ).status,
    413
  );

  await assert.rejects(
    readFile(join(dataDir, 'messages.jsonl')),
    { code: 'ENOENT' }
  );
});

test('contact rejects foreign origins and non-JSON requests', async t => {
  const { request } = await fixture(t);

  const foreign = json(sample);
  foreign.headers.Origin = 'https://other.example';

  assert.equal(
    (await request('/api/contact', foreign)).status,
    403
  );

  assert.equal(
    (
      await request('/api/contact', {
        method: 'POST',
        body: 'name=Alex'
      })
    ).status,
    415
  );
});

test('contact rate limiting prevents excess writes', async t => {
  const { dataDir, request } = await fixture(t, {
    contactLimit: 2
  });

  assert.equal(
    (await request('/api/contact', json(sample))).status,
    201
  );

  assert.equal(
    (await request('/api/contact', json(sample))).status,
    201
  );

  const limited = await request('/api/contact', json(sample));

  assert.equal(limited.status, 429);
  assert.match((await limited.json()).error, /Too many/);

  assert.equal(
    (
      await readFile(join(dataDir, 'messages.jsonl'), 'utf8')
    ).trim().split('\n').length,
    2
  );
});

test('concurrent submissions remain complete, distinct JSON records', async t => {
  const { dataDir, request } = await fixture(t, {
    contactLimit: 20
  });

  const responses = await Promise.all(
    Array.from({ length: 10 }, (_, index) =>
      request(
        '/api/contact',
        json({ ...sample, name: `Visitor ${index}` })
      )
    )
  );

  assert.ok(
    responses.every(response => response.status === 201)
  );

  const records = (
    await readFile(join(dataDir, 'messages.jsonl'), 'utf8')
  )
    .trim()
    .split('\n')
    .map(JSON.parse);

  assert.equal(records.length, 10);
  assert.equal(new Set(records.map(record => record.id)).size, 10);
  assert.equal(new Set(records.map(record => record.name)).size, 10);
});

test('storage failure returns failure instead of a false success', async t => {
  const temp = await mkdtemp(join(tmpdir(), 'finds-unwritable-'));

  t.after(() => rm(temp, { recursive: true, force: true }));

  const blocker = join(temp, 'file');

  await writeFile(blocker, 'not a directory');

  const { request } = await fixture(t, { dataDir: blocker });

  const response = await request('/api/contact', json(sample));

  assert.equal(response.status, 500);

  assert.deepEqual(
    await response.json(),
    { error: 'Something went wrong. Please try again.' }
  );
});

test('refuses to store contact details inside the public website', () => {
  for (const path of [
    'finds-static',
    'finds-static/data',
    'finds-static/..private'
  ]) {
    assert.throws(
      () => createApp({ dataDir: resolve(path) }),
      /outside finds-static/
    );
  }
});
