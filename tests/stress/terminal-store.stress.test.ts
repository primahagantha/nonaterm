import { performance } from 'node:perf_hooks';
import { useTerminalStore } from '@/stores/terminalStore';

describe('terminal store stress', () => {
  beforeEach(() => {
    useTerminalStore.setState({ sessions: {} });
  });

  it('handles repeated output bookkeeping for 9 panes', () => {
    for (let index = 0; index < 9; index += 1) {
      useTerminalStore
        .getState()
        .startSession(`pane-${index + 1}`, 'workspace-1');
    }

    const startedAt = performance.now();

    for (let pass = 0; pass < 2000; pass += 1) {
      for (let index = 0; index < 9; index += 1) {
        useTerminalStore.getState().markOutput(`pane-${index + 1}`);
      }
    }

    expect(Object.keys(useTerminalStore.getState().sessions)).toHaveLength(9);
    expect(performance.now() - startedAt).toBeLessThan(1000);
  });
});
