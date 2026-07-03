// perf-baseline-lib.mjs — pure functions used by perf-check.mjs and
// vitest tests. Keep this module side-effect-free so it can be
// imported from Node tests + Playwright E2E.

export const DEFAULT_REGRESSION_THRESHOLD_PCT = 10;

/**
 * @typedef {Object} MetricPair
 * @property {string} name
 * @property {number} baseline
 * @property {number} current
 * @property {'lower-is-better' | 'higher-is-better'} direction
 */

/**
 * @typedef {Object} MetricDeltaResult
 * @property {string} name
 * @property {number} baseline
 * @property {number} current
 * @property {number} deltaPct
 * @property {boolean} regressed
 * @property {'lower-is-better' | 'higher-is-better'} direction
 */

/**
 * @typedef {Object} BaselineComparison
 * @property {number} thresholdPct
 * @property {MetricDeltaResult[]} deltas
 * @property {number} regressedCount
 * @property {boolean} passed
 */

function getPath(obj, segments) {
  let v = obj;
  for (const k of segments) {
    if (v == null) return undefined;
    v = v[k];
  }
  return typeof v === 'number' ? v : 0;
}

export const METRIC_REGISTRY = [
  { name: 'multi_spawn.total_spawn_ms', path: ['multiSpawn', 'totalSpawnMs'], direction: 'lower-is-better' },
  { name: 'multi_spawn.avg_spawn_ms', path: ['multiSpawn', 'avgSpawnMs'], direction: 'lower-is-better' },
  { name: 'multi_spawn.p95_spawn_ms', path: ['multiSpawn', 'p95SpawnMs'], direction: 'lower-is-better' },
  { name: 'multi_spawn.rss_delta_bytes', path: ['multiSpawn', 'rssDeltaBytes'], direction: 'lower-is-better' },
  { name: 'idle.rss_max_bytes', path: ['idle', 'rssMaxBytes'], direction: 'lower-is-better' },
  { name: 'idle.rss_delta_bytes', path: ['idle', 'rssDeltaBytes'], direction: 'lower-is-better' },
  { name: 'throughput.throughput_kbps', path: ['throughput', 'throughputKbps'], direction: 'higher-is-better' },
  { name: 'throughput.total_bytes', path: ['throughput', 'totalBytes'], direction: 'higher-is-better' },
];

/**
 * Compare a current perf report against a baseline document.
 *
 * @param {object} current — current report (shape produced by perf_probe example)
 * @param {object} baseline — baseline document (same shape)
 * @param {number} [thresholdPct=10] — allowed regression percentage
 * @returns {BaselineComparison}
 */
export function compareReports(current, baseline, thresholdPct = DEFAULT_REGRESSION_THRESHOLD_PCT) {
  const deltas = METRIC_REGISTRY
    .map((m) => {
      const base = getPath(baseline, m.path);
      const cur = getPath(current, m.path);
      const deltaPct = base > 0 ? ((cur - base) / base) * 100 : 0;
      const factor = base > 0 ? cur / base : 0;
      const regressed =
        base > 0 &&
        (m.direction === 'lower-is-better'
          ? factor > 1 + thresholdPct / 100
          : factor < 1 - thresholdPct / 100);
      return {
        name: m.name,
        baseline: base,
        current: cur,
        deltaPct,
        regressed,
        direction: m.direction,
      };
    })
    .filter((d) => d.baseline > 0);

  const regressedCount = deltas.filter((d) => d.regressed).length;
  return {
    thresholdPct,
    deltas,
    regressedCount,
    passed: regressedCount === 0,
  };
}

/**
 * Format a comparison result as a multi-line string for CLI output.
 *
 * @param {BaselineComparison} comparison
 * @returns {string}
 */
export function formatReport(comparison) {
  const status = comparison.passed ? 'PASS' : 'FAIL';
  const lines = [
    `[perf-check] ${status} (threshold ±${comparison.thresholdPct}%, regressed: ${comparison.regressedCount})`,
  ];
  for (const d of comparison.deltas) {
    const sign = d.deltaPct >= 0 ? '+' : '';
    const marker = d.regressed ? 'REGRESSION' : 'ok';
    lines.push(
      `  - ${d.name.padEnd(32)} baseline=${String(d.baseline).padStart(12)} current=${String(d.current).padStart(12)} Δ=${sign}${d.deltaPct.toFixed(2).padStart(7)}% [${marker}]`,
    );
  }
  return lines.join('\n');
}

/**
 * Pick the right CLI flag list for the perf_probe binary.
 *
 * @param {object} options
 * @param {string} options.output
 * @param {string} options.baseline
 * @param {number} options.panes
 * @param {number} options.dwell
 * @param {number} options.lines
 * @returns {string[]}
 */
export function probeArgs({ output, baseline, panes, dwell, lines }) {
  const args = [
    '--output',
    output,
    '--baseline',
    baseline,
    '--panes',
    String(panes),
    '--dwell',
    String(dwell),
    '--lines',
    String(lines),
  ];
  return args;
}
