import { execFileSync, spawn } from 'node:child_process';

const database = process.env.TEST_DATABASE_URL;
if (!database || !new URL(database).pathname.endsWith('_test') || database === process.env.DATABASE_URL) {
  throw new Error('Use a dedicated TEST_DATABASE_URL ending in _test, different from DATABASE_URL.');
}
const env = { ...process.env, DATABASE_URL: database, ORGANIZER_ACCESS_TOKEN: 'playwright-only-key' };
execFileSync('uv', ['run', '--frozen', 'alembic', 'upgrade', 'head'], { env, stdio: 'inherit' });
const api = spawn('uv', ['run', '--frozen', 'uvicorn', 'backend.app.main:create_app', '--factory', '--host', '127.0.0.1', '--port', '18001'], { env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => api.kill(signal));
api.on('exit', (code) => process.exit(code ?? 1));
