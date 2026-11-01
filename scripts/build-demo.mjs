import { fileURLToPath } from 'node:url';
import './runtime-env.mjs';
process.env.CAPSTONE_DEMO = '1';
const cli = new URL('../node_modules/vinext/dist/cli.js', import.meta.url);
process.argv = [process.execPath, fileURLToPath(cli), 'build'];
await import(cli.href);
