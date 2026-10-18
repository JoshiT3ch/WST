import { createApp } from './app.js';

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
const server = createApp().listen(port, host, () => {
  console.log(`Finds is running at http://${host}:${port}`);
});
server.on('error', error => {
  console.error(`Could not start Finds: ${error.message}`);
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => { process.exitCode = 0; }));
}
