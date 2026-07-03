import { performance } from 'node:perf_hooks';
import { defaultWorkspaces, useWorkspaceStore } from '@/stores/workspaceStore';
import type { WorkspaceSummary } from '@/types/ipc';

function buildWorkspaceSummaries(count: number): WorkspaceSummary[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `workspace-${index + 1}`,
    name: `Workspace ${index + 1}`,
    accentColor: '#7c3aed',
    paneCount: 9,
  }));
}

describe('workspaceStore performance smoke', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      activeWorkspaceId: defaultWorkspaces[0].id,
      workspaces: defaultWorkspaces,
    });
  });

  it('hydrates nine 9-pane workspaces well under the PRD switch budget', () => {
    const summaries = buildWorkspaceSummaries(9);

    const startedAt = performance.now();
    useWorkspaceStore.getState().hydrateFromSummaries(summaries);
    const elapsedMs = performance.now() - startedAt;

    expect(useWorkspaceStore.getState().workspaces).toHaveLength(9);
    expect(elapsedMs).toBeLessThan(100);
  });

  it('switches active workspace repeatedly without approaching the 100ms target', () => {
    useWorkspaceStore.getState().hydrateFromSummaries(buildWorkspaceSummaries(9));

    const startedAt = performance.now();

    for (let index = 1; index <= 500; index += 1) {
      useWorkspaceStore.getState().setActiveWorkspace(`workspace-${(index % 9) + 1}`);
    }

    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
  });
});
