/** Starts isolated preview + mock servers, then runs every browser gate and cleans up. */
const { spawn } = require('node:child_process');
const net = require('node:net');
const { join } = require('node:path');

const cwd = process.cwd();
const node = process.execPath;

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}
function start(command, args, env = {}) {
  const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (chunk) => process.stdout.write(`[server] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[server] ${chunk}`));
  return child;
}
function run(script, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(node, [script], { cwd, env: { ...process.env, ...env }, stdio: 'inherit' });
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${script} exited ${code ?? signal}`)));
    child.once('error', reject);
  });
}
async function waitFor(url, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try { if ((await fetch(url)).ok) return; } catch { /* server is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

(async () => {
  const appPort = await freePort();
  const mockPort = await freePort();
  const app = `http://127.0.0.1:${appPort}/`;
  const mockRoot = `http://127.0.0.1:${mockPort}`;
  const preview = start(node, [join(cwd, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(appPort), '--strictPort']);
  const mock = start(node, ['mock-provider.mjs'], { MOCK_PORT: String(mockPort) });
  try {
    await Promise.all([waitFor(app), waitFor(`${mockRoot}/__reset`)]);
    console.log(`verify-all: isolated app ${app} · mock ${mockRoot}`);
    await run('verify-e2e.cjs', { APP_URL: app });
    await run('verify-keyed.cjs', { APP_URL: app, MOCK_URL: mockRoot });
    await run('verify-errors.cjs', { APP_URL: app, MOCK_ROOT: mockRoot });
    await run('verify-contrast.cjs', { APP_URL: app });
    console.log('verify-all: every production and browser gate passed ✓');
  } finally {
    preview.kill('SIGTERM');
    mock.kill('SIGTERM');
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
