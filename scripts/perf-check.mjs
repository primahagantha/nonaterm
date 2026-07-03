#!/usr/bin/env node
// perf-check.mjs — run perf probe and compare against baseline.
//
// Steps:
//   1. Invoke `cargo run --release --example perf_probe --` (or skip if
//      `--report` is given a pre-generated report).
//   2. Read `perf-report.json` + `perf-baseline.json`.
//   3. Pass-through: example binary already fails on regression. This
//      script adds Node-side validation + machine-readable CI summary.
//
// Flags:
//   --report PATH       Skip running probe; reuse existing report JSON
//   --baseline PATH     Path to baseline (default: perf-baseline.json)
//   --probe-bin PATH    Path to perf_probe binary (auto-detected)
//   --threshold PCT     Regression threshold (default: 10)
//   --quiet             Only print summary line

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  DEFAULT_REGRESSION_THRESHOLD_PCT,
  compareReports,
  formatReport,
  probeArgs,
} from './perf-baseline-lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');

function parseArgs(argv) {
  const out = {
    report: null,
    baseline: path.join(ROOT, 'perf-baseline.json'),
    probeBin: null,
    threshold: DEFAULT_REGRESSION_THRESHOLD_PCT,
    quiet: false,
    skipProbe: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--report':
        out.report = argv[++i];
        out.skipProbe = true;
        break;
      case '--baseline':
        out.baseline = argv[++i];
        break;
      case '--probe-bin':
        out.probeBin = argv[++i];
        break;
      case '--threshold':
        out.threshold = Number(argv[++i]);
        break;
      case '--quiet':
        out.quiet = true;
        break;
      case '--help':
      case '-h':
        console.log(
          'Usage: node scripts/perf-check.mjs [options]\n' +
            '\nOptions:\n' +
            '  --report PATH       Reuse existing perf-report.json\n' +
            '  --baseline PATH     Path to perf-baseline.json\n' +
            '  --probe-bin PATH    Path to compiled perf_probe binary\n' +
            '  --threshold PCT     Regression threshold (default: 10)\n' +
            '  --quiet             Only print summary line',
        );
        process.exit(0);
        break;
      default:
        console.error(`unknown flag: ${a}`);
        process.exit(2);
    }
  }
  return out;
}

function defaultProbeBin() {
  const isWin = process.platform === 'win32';
  const exe = isWin ? 'perf_probe.exe' : 'perf_probe';
  const candidates = [
    path.join(ROOT, 'src-tauri', 'target', 'release', 'examples', exe),
    path.join(ROOT, 'src-tauri', 'target', 'debug', 'examples', exe),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function runProbe(bin, opts) {
  const reportPath = path.join(ROOT, 'perf-report.json');
  if (!opts.quiet) {
    console.log(`[perf-check] running probe: ${bin}`);
  }
  const result = spawnSync(
    bin,
    probeArgs({
      output: reportPath,
      baseline: opts.baseline,
      panes: 9,
      dwell: 1500,
      lines: 100,
    }),
    { stdio: ['ignore', 'pipe', 'inherit'] },
  );
  if (result.status !== 0) {
    return { ok: false, status: result.status, stdout: result.stdout?.toString() ?? '' };
  }
  if (!existsSync(reportPath)) {
    return { ok: false, status: 1, stdout: 'probe did not write perf-report.json' };
  }
  return { ok: true, reportPath };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!existsSync(opts.baseline)) {
    console.error(`[perf-check] baseline not found: ${opts.baseline}`);
    console.error('[perf-check] create it with: cp perf-baseline.example.json perf-baseline.json');
    process.exit(2);
  }
  const baseline = JSON.parse(readFileSync(opts.baseline, 'utf8'));

  if (!opts.skipProbe) {
    const bin = opts.probeBin ?? defaultProbeBin();
    if (!bin) {
      console.error(
        '[perf-check] perf_probe binary not found. Build it first:\n' +
          '  cargo build --release --manifest-path src-tauri/Cargo.toml --example perf_probe',
      );
      process.exit(2);
    }
    const result = runProbe(bin, opts);
    if (!result.ok) {
      console.error(`[perf-check] probe failed with status ${result.status}`);
      if (result.stdout) console.error(result.stdout);
      process.exit(result.status || 1);
    }
  }

  const reportPath = opts.report ?? path.join(ROOT, 'perf-report.json');
  if (!existsSync(reportPath)) {
    console.error(`[perf-check] report not found: ${reportPath}`);
    process.exit(2);
  }
  const current = JSON.parse(readFileSync(reportPath, 'utf8'));

  const comparison = compareReports(current, baseline, opts.threshold);
  console.log(formatReport(comparison));

  // Always write a machine-readable summary next to the report for
  // downstream consumers (e.g. GitHub Actions annotations).
  const summaryPath = path.join(ROOT, 'perf-summary.json');
  try {
    writeFileSync(
      summaryPath,
      JSON.stringify(
        { ...comparison, generatedAt: new Date().toISOString() },
        null,
        2,
      ),
    );
  } catch (err) {
    console.error(`[perf-check] could not write ${summaryPath}: ${err.message}`);
  }

  if (!comparison.passed) {
    process.exit(1);
  }
  if (opts.quiet) {
    console.log(`[perf-check] OK — all ${comparison.deltas.length} metrics within ±${opts.threshold}%`);
  }
}

main();
