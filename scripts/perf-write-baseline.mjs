#!/usr/bin/env node
// perf-write-baseline.mjs — write a fresh perf-baseline.json from a
// perf-report.json. Use this when:
//   1. The current numbers are good and should become the new
//      regression baseline.
//   2. The first real measurement on a target machine establishes the
//      starting point (replaces the placeholder values).
//
// Usage:
//   node scripts/perf-write-baseline.mjs [--report PATH] [--out PATH]

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');

function parseArgs(argv) {
  const out = {
    report: path.join(ROOT, 'perf-report.json'),
    out: path.join(ROOT, 'perf-baseline.json'),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--report') out.report = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '-h' || a === '--help') {
      console.log(
        'Usage: node scripts/perf-write-baseline.mjs [--report PATH] [--out PATH]',
      );
      process.exit(0);
    } else {
      console.error(`unknown flag: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!existsSync(opts.report)) {
    console.error(`[perf-baseline] report not found: ${opts.report}`);
    process.exit(2);
  }
  const report = JSON.parse(readFileSync(opts.report, 'utf8'));
  const baseline = {
    ...report,
    capturedAt: new Date().toISOString(),
    notes: 'Updated by scripts/perf-write-baseline.mjs',
  };
  writeFileSync(opts.out, JSON.stringify(baseline, null, 2));
  console.log(`[perf-baseline] wrote ${opts.out}`);
  console.log(
    `[perf-baseline] panes=${baseline.multiSpawn?.panes ?? '?'} total_spawn_ms=${baseline.multiSpawn?.totalSpawnMs ?? '?'} idle_rss_max_bytes=${baseline.idle?.rssMaxBytes ?? '?'} throughput_kbps=${baseline.throughput?.throughputKbps?.toFixed(1) ?? '?'}`,
  );
  // Show the user we did not accidentally drop perPane counters
  if (Array.isArray(baseline.throughput?.perPane)) {
    console.log(
      `[perf-baseline] throughput per-pane entries: ${baseline.throughput.perPane.length}`,
    );
  }
}

main();
