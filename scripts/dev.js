import { context } from 'esbuild';
import { spawn } from 'node:child_process';

const builder = await context({
  entryPoints: ['frontend/main.jsx'],
  bundle: true,
  format: 'esm',
  jsx: 'automatic',
  sourcemap: true,
  outfile: 'finds-static/js/app.js',
  define: { 'process.env.NODE_ENV': '"development"' },
  logLevel: 'info'
});
await builder.watch();
// Wait for the first bundle before serving pages that reference it.
await builder.rebuild();
const server = spawn(process.execPath, ['--watch', 'server/index.js'], { stdio: 'inherit' });
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  server.kill();
  await builder.dispose();
  process.exitCode = code;
}
server.on('error', error => {
  console.error(error.message);
  void stop(1);
});
server.on('exit', code => { void stop(code || 0); });
process.on('SIGINT', () => { void stop(); });
process.on('SIGTERM', () => { void stop(); });
