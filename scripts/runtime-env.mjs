import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const runtime = path.join(root, '.wrangler');
const defaults = {
  CLOUDFLARE_CF_FETCH_ENABLED: 'false',
  WRANGLER_SEND_METRICS: 'false',
  WRANGLER_WRITE_LOGS: 'false',
  WRANGLER_LOG_PATH: path.join(runtime, 'logs'),
  WRANGLER_REGISTRY_PATH: path.join(runtime, 'dev-registry'),
  MINIFLARE_REGISTRY_PATH: path.join(runtime, 'registry'),
};
for (const [name, value] of Object.entries(defaults)) process.env[name] ??= value;
for (const directory of ['logs', 'dev-registry', 'registry']) mkdirSync(path.join(runtime, directory), { recursive: true });
