// scripts/ci-build.mjs
import { spawn } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';

process.env.NODE_ENV = 'production';
process.env.CI = process.env.CI ?? 'true';
process.env.NEXT_TELEMETRY_DISABLED = '1';
// Help some environments avoid memory stalls (safe no-op if enough RAM)
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=4096`.trim();

// Clean caches that can sometimes keep watchers around
for (const dir of ['.next', '.turbo']) {
  try { if (existsSync(dir)) rmSync(dir, { recursive: true, force: true }); } catch {}
}

// We keep the real Next build in a separate script so "build" can do orchestration.
const runner = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = ['run', '_next-build'];

const child = spawn(runner, args, { 
  stdio: 'inherit', 
  env: process.env,
  shell: process.platform === 'win32'
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('::BUILD_SENTINEL::BUILD_OK');
    process.exit(0);
  } else {
    console.error('::BUILD_SENTINEL::BUILD_FAILED', code ?? 'unknown');
    process.exit(code ?? 1);
  }
});

child.on('error', (err) => {
  console.error('::BUILD_SENTINEL::BUILD_FAILED spawn_error', err?.message || err);
  process.exit(1);
});
