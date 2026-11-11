// Review-only single-process serving contract. No secrets or .env loading.
// Set absolute paths for the chosen staged release and interpreters. A frontend
// release must include standalone server.js, public/ and .next/static/.
const fs = require('node:fs');
const path = require('node:path');
function requiredPath(key, file) {
  const value = process.env[key];
  if (!value || !path.isAbsolute(value) || !fs.existsSync(value)) throw new Error(`${key} must name an existing absolute path`);
  if (file && !fs.statSync(value).isFile()) throw new Error(`${key} must name a file`);
  return value;
}
if (process.env.APP_ENV !== 'production') throw new Error('APP_ENV=production is required');
const release = requiredPath('MANA_VIVAHA_RELEASE_DIR', false);
const python = requiredPath('MANA_VIVAHA_PYTHON', true);
const node = requiredPath('MANA_VIVAHA_NODE', true);
const frontend = requiredPath('MANA_VIVAHA_STANDALONE_DIR', false);
for (const file of ['server.js', 'public', '.next/static']) {
  if (!fs.existsSync(path.join(frontend, file))) throw new Error(`Standalone artifact missing ${file}`);
}
module.exports = { apps: [
  { name: 'manavivaha-backend', cwd: release,
    script: path.join(release, 'backend/serve_production.py'), interpreter: python,
    instances: 1, exec_mode: 'fork', watch: false, autorestart: true, max_restarts: 5, min_uptime: '10s',
    env: { APP_ENV: 'production', PYTHONUNBUFFERED: '1', PYTHONDONTWRITEBYTECODE: '1' } },
  { name: 'manavivaha-frontend', cwd: frontend,
    script: path.join(frontend, 'server.js'), interpreter: node,
    instances: 1, exec_mode: 'fork', watch: false, autorestart: true, max_restarts: 5, min_uptime: '10s',
    env: { NODE_ENV: 'production', PORT: '3000', HOSTNAME: '127.0.0.1', NEXT_TELEMETRY_DISABLED: '1' } }
] };
