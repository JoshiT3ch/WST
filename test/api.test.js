import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { createApp } from '../server/app.js';

const sample = { name: ' Alex Santos ', email: ' alex@example.com ', topic: 'general', message: ' How does Finds work? ' };
const json = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

async function fixture(t, options = {}) {
  const dataDir = await mkdtemp(join(tmpdir(), 'finds-test-'));
  const server = createApp({ dataDir, ...options }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
    await rm(dataDir, { recursive: true, force: true });
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  return { dataDir, server, request: (path, init) => fetch(`${url}${path}`, init) };
}

test('serves all website pages and assets, without exposing backend files', async t => {
  const { request } = await fixture(t);
  for (const path of ['/', '/about.html', '/contact.html', '/faqs.html', '/how-it-works.html', '/css/style.css', '/js/main.js', '/images/products/jacket.svg']) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
  for (const path of ['/server/data/products.json', '/package.json', '/.env', '/.data/messages.jsonl', '/node_modules/express/package.json']) {
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
  const filtered = await (await request('/api/products?q=DENIM%20medium&audience=Men')).json();
  assert.deepEqual(filtered.products.map(item => item.id), ['jacket']);
  assert.equal(filtered.total, 1);
  assert.deepEqual(await (await request('/api/products?audience=Kids')).json(), { products: [], total: 0 });
  assert.equal((await (await request('/api/products?q=not-in-catalogue')).json()).total, 0);
  for (const query of ['audience=bad', 'q=a&q=b', 'audience=Men&audience=Kids', `q=${'a'.repeat(101)}`]) {
    assert.equal((await request(`/api/products?${query}`)).status, 400);
  }
});

test('product details match the catalogue and unknown items return JSON 404', async t => {
  const { request } = await fixture(t);
  const { product } = await (await request('/api/products/jacket')).json();
  assert.equal(product.title, 'Vintage denim jacket');
  assert.match(product.description, /denim/);
  const response = await request('/api/products/missing');
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Find not found.' });
  assert.equal((await request('/api/missing')).status, 404);
});

test('contact confirms persistence, trims fields, and ignores extra fields', async t => {
  const { dataDir, request } = await fixture(t);
  const response = await request('/api/contact', json({ ...sample, id: 'forged', admin: true }));
  assert.equal(response.status, 201);
  const receipt = await response.json();
  const saved = JSON.parse((await readFile(join(dataDir, 'messages.jsonl'), 'utf8')).trim());
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
  assert.equal((await request('/api/contact', json(sample))).status, 201);
  const nextServer = createApp({ dataDir }).listen(0, '127.0.0.1');
  await once(nextServer, 'listening');
  t.after(() => new Promise(resolveClose => nextServer.close(resolveClose)));
  const response = await fetch(`http://127.0.0.1:${nextServer.address().port}/api/contact`, json({ ...sample, name: 'Second message' }));
  assert.equal(response.status, 201);
  const records = (await readFile(join(dataDir, 'messages.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(records.length, 2);
  assert.equal(records[0].name, 'Alex Santos');
  assert.equal(records[1].name, 'Second message');
});

test('rejects invalid contact fields and malformed or oversized JSON without saving', async t => {
  const { dataDir, request } = await fixture(t, { contactLimit: 100 });
  for (const body of [null, [], {}, { ...sample, name: ' ' }, { ...sample, name: 'a'.repeat(81) }, { ...sample, email: 'invalid' }, { ...sample, topic: 'unknown' }, { ...sample, message: 'short' }, { ...sample, message: 'a'.repeat(2001) }, { ...sample, name: {} }]) {
    assert.equal((await request('/api/contact', json(body))).status, 400);
  }
  assert.equal((await request('/api/contact', { ...json(sample), body: '{broken' })).status, 400);
  assert.equal((await request('/api/contact', json({ ...sample, message: 'x'.repeat(17000) }))).status, 413);
  await assert.rejects(readFile(join(dataDir, 'messages.jsonl')), { code: 'ENOENT' });
});

test('contact rejects foreign origins and non-JSON requests', async t => {
  const { request } = await fixture(t);
  const foreign = json(sample);
  foreign.headers.Origin = 'https://other.example';
  assert.equal((await request('/api/contact', foreign)).status, 403);
  assert.equal((await request('/api/contact', { method: 'POST', body: 'name=Alex' })).status, 415);
});

test('contact rate limiting prevents excess writes', async t => {
  const { dataDir, request } = await fixture(t, { contactLimit: 2 });
  assert.equal((await request('/api/contact', json(sample))).status, 201);
  assert.equal((await request('/api/contact', json(sample))).status, 201);
  const limited = await request('/api/contact', json(sample));
  assert.equal(limited.status, 429);
  assert.match((await limited.json()).error, /Too many/);
  assert.equal((await readFile(join(dataDir, 'messages.jsonl'), 'utf8')).trim().split('\n').length, 2);
});

test('concurrent submissions remain complete, distinct JSON records', async t => {
  const { dataDir, request } = await fixture(t, { contactLimit: 20 });
  const responses = await Promise.all(Array.from({ length: 10 }, (_, index) => request('/api/contact', json({ ...sample, name: `Visitor ${index}` }))));
  assert.ok(responses.every(response => response.status === 201));
  const records = (await readFile(join(dataDir, 'messages.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
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
  assert.deepEqual(await response.json(), { error: 'Something went wrong. Please try again.' });
});

test('refuses to store contact details inside the public website', () => {
  for (const path of ['finds-static', 'finds-static/data', 'finds-static/..private']) {
    assert.throws(() => createApp({ dataDir: resolve(path) }), /outside finds-static/);
  }
});
