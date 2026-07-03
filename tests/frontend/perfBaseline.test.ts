import { describe, it, expect } from 'vitest';
// perf-baseline-lib.mjs uses named ESM exports. Vitest's CJS-style
// default-import proxy misreads named-only modules; import everything
// via namespace and destructure with explicit types.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Node ESM module without .d.ts; access via `lib.<name>`.
import * as lib from '../../scripts/perf-baseline-lib.mjs';

type MetricDelta = {
  name: string;
  baseline: number;
  current: number;
  deltaPct: number;
  regressed: boolean;
  direction: 'lower-is-better' | 'higher-is-better';
};

type Comparison = {
  thresholdPct: number;
  deltas: MetricDelta[];
  regressedCount: number;
  passed: boolean;
};

const { DEFAULT_REGRESSION_THRESHOLD_PCT, METRIC_REGISTRY, compareReports, formatReport, probeArgs } =
  lib as unknown as {
    DEFAULT_REGRESSION_THRESHOLD_PCT: number;
    METRIC_REGISTRY: Array<{
      name: string;
      path: string[];
      direction: 'lower-is-better' | 'higher-is-better';
    }>;
    compareReports: (
      current: Record<string, unknown>,
      baseline: Record<string, unknown>,
      thresholdPct?: number,
    ) => Comparison;
    formatReport: (comparison: Comparison) => string;
    probeArgs: (opts: {
      output: string;
      baseline: string;
      panes: number;
      dwell: number;
      lines: number;
    }) => string[];
  };

const baseline = {
  multiSpawn: {
    totalSpawnMs: 1800,
    avgSpawnMs: 200,
    p95SpawnMs: 290,
    rssDeltaBytes: 25_000_000,
  },
  idle: {
    rssMaxBytes: 80_000_000,
    rssDeltaBytes: 4_000_000,
  },
  throughput: {
    throughputKbps: 200,
    totalBytes: 14_400,
  },
};

describe('perf-baseline-lib', () => {
  it('exports the default threshold as 10%', () => {
    expect(DEFAULT_REGRESSION_THRESHOLD_PCT).toBe(10);
  });

  it('exposes the metric registry with known metrics', () => {
    const names = METRIC_REGISTRY.map((m) => m.name);
    expect(names).toContain('multi_spawn.total_spawn_ms');
    expect(names).toContain('idle.rss_max_bytes');
    expect(names).toContain('throughput.throughput_kbps');
    const directions = new Set(METRIC_REGISTRY.map((m) => m.direction));
    expect(directions.has('lower-is-better')).toBe(true);
    expect(directions.has('higher-is-better')).toBe(true);
  });

  it('passes when every metric is at or below baseline (lower-is-better)', () => {
    const current = {
      multiSpawn: {
        totalSpawnMs: 1700,
        avgSpawnMs: 180,
        p95SpawnMs: 270,
        rssDeltaBytes: 24_000_000,
      },
      idle: {
        rssMaxBytes: 78_000_000,
        rssDeltaBytes: 3_500_000,
      },
      throughput: {
        throughputKbps: 220,
        totalBytes: 14_400,
      },
    };
    const result = compareReports(current, baseline, 10);
    expect(result.passed).toBe(true);
    expect(result.regressedCount).toBe(0);
    expect(result.deltas.length).toBeGreaterThan(0);
  });

  it('flags lower-is-better metric that exceeds the threshold', () => {
    const current = {
      multiSpawn: {
        totalSpawnMs: 2400,
        avgSpawnMs: 200,
        p95SpawnMs: 290,
        rssDeltaBytes: 25_000_000,
      },
      idle: {
        rssMaxBytes: 80_000_000,
        rssDeltaBytes: 4_000_000,
      },
      throughput: {
        throughputKbps: 200,
        totalBytes: 14_400,
      },
    };
    const result = compareReports(current, baseline, 10);
    expect(result.passed).toBe(false);
    const regressed = result.deltas.find((d) => d.name === 'multi_spawn.total_spawn_ms');
    expect(regressed?.regressed).toBe(true);
  });

  it('flags higher-is-better metric that drops below threshold', () => {
    const current = {
      multiSpawn: {
        totalSpawnMs: 1800,
        avgSpawnMs: 200,
        p95SpawnMs: 290,
        rssDeltaBytes: 25_000_000,
      },
      idle: {
        rssMaxBytes: 80_000_000,
        rssDeltaBytes: 4_000_000,
      },
      throughput: {
        throughputKbps: 150, // -25% — should fail at 10% threshold
        totalBytes: 14_400,
      },
    };
    const result = compareReports(current, baseline, 10);
    expect(result.passed).toBe(false);
    const regressed = result.deltas.find(
      (d) => d.name === 'throughput.throughput_kbps',
    );
    expect(regressed?.regressed).toBe(true);
  });

  it('treats zero baseline as n/a (skipped from deltas)', () => {
    const zeroBaseline = {
      multiSpawn: {
        totalSpawnMs: 0,
        avgSpawnMs: 0,
        p95SpawnMs: 0,
        rssDeltaBytes: 0,
      },
      idle: {
        rssMaxBytes: 0,
        rssDeltaBytes: 0,
      },
      throughput: {
        throughputKbps: 0,
        totalBytes: 0,
      },
    };
    const result = compareReports(baseline, zeroBaseline, 10);
    expect(result.deltas).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.regressedCount).toBe(0);
  });

  it('formatReport renders PASS / REGRESSION markers', () => {
    const current = {
      ...baseline,
      multiSpawn: { ...baseline.multiSpawn, totalSpawnMs: 2400 },
    };
    const result = compareReports(current, baseline, 10);
    const text = formatReport(result);
    expect(text).toContain('FAIL');
    expect(text).toContain('REGRESSION');
    expect(text).toContain('multi_spawn.total_spawn_ms');
  });

  it('respects a custom threshold', () => {
    const current = {
      ...baseline,
      multiSpawn: { ...baseline.multiSpawn, totalSpawnMs: 1950 }, // +8.3%
    };
    const loose = compareReports(current, baseline, 10);
    expect(loose.passed).toBe(true);
    const strict = compareReports(current, baseline, 5);
    expect(strict.passed).toBe(false);
  });

  it('probeArgs emits the right flag set', () => {
    const args = probeArgs({
      output: '/tmp/r.json',
      baseline: '/tmp/b.json',
      panes: 6,
      dwell: 1500,
      lines: 100,
    });
    expect(args).toEqual([
      '--output',
      '/tmp/r.json',
      '--baseline',
      '/tmp/b.json',
      '--panes',
      '6',
      '--dwell',
      '1500',
      '--lines',
      '100',
    ]);
  });
});
