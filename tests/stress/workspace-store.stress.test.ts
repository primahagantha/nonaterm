import { performance } from 'node:perf_hooks';
import { defaultWorkspaces, useWorkspaceStore } from '@/stores/workspaceStore';

describe('workspace store stress', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      activeWorkspaceId: defaultWorkspaces[0].id,
      workspaces: defaultWorkspaces,
    });
  });

  it('creates and reorders many workspaces without slowing down badly', () => {
    const startedAt = performance.now();

    for (let index = 0; index < 50; index += 1) {
      useWorkspaceStore.getState().createWorkspace(`WS ${index + 1}`);
    }

    for (let index = 1; index < 25; index += 1) {
      useWorkspaceStore.getState().reorderWorkspaces(index, index - 1);
    }

    expect(
      useWorkspaceStore.getState().workspaces.length,
    ).toBeGreaterThanOrEqual(52);
    expect(performance.now() - startedAt).toBeLessThan(1000);
  });
});
