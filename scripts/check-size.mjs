#!/usr/bin/env node
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function dirSizeMB(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  try {
    const entries = readdirSync(dir, { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      // Node 20+: withFileTypes + recursive gives us `parentPath` on
      // the entry which is the full directory containing this file.
      const parent = entry.parentPath ?? entry.path;
      const fullPath = join(parent, entry.name);
      try {
        total += statSync(fullPath).size;
      } catch {
        // skip unreadable file
      }
    }
  } catch (err) {
    console.error(`(dirSizeMB: ${err.message})`);
    return 0;
  }
  return total / 1024 / 1024;
}

function fmtMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(1);
}

const releaseBundle = join(ROOT, 'src-tauri/target/release/bundle');
const msiMB = dirSizeMB(join(releaseBundle, 'msi'));
const nsisMB = dirSizeMB(join(releaseBundle, 'nsis'));
const totalMB = msiMB + nsisMB;
const targetMB = 150;

console.log('--- bundle size ---');
console.log(`MSI bundle:  ${msiMB.toFixed(1)} MB`);
console.log(`NSIS bundle: ${nsisMB.toFixed(1)} MB`);
console.log(`Total:       ${totalMB.toFixed(1)} MB`);
console.log(`PRD target:  <${targetMB} MB`);
console.log(
  `Status:      ${totalMB < targetMB ? 'PASS' : totalMB === 0 ? 'NO BUNDLE' : 'NEEDS REVIEW'}`,
);

const baselinePath = join(ROOT, 'perf-baseline.json');
if (!existsSync(baselinePath)) {
  console.log('\n(no perf-baseline.json found)');
} else {
  try {
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
    console.log('\n--- perf baseline snapshot ---');
    console.log(`Multi-spawn: ${baseline.multiSpawn.totalSpawnMs}ms (target <1800ms)`);
    console.log(`Idle RSS max: ${fmtMB(baseline.idle.rssMaxBytes)}MB (target <200MB)`);
    console.log(`Throughput:  ${baseline.throughput.throughputKbps.toFixed(2)} KB/s`);
  } catch (err) {
    console.log(`\n(failed to parse perf-baseline.json: ${err.message})`);
  }
}