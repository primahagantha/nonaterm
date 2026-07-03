import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '@/stores/workspaceStore';

describe('Concurrent workspace CRUD stress', () => {
  beforeEach(() => {
    // Reset to a clean state
    useWorkspaceStore.setState({ workspaces: [], activeWorkspaceId: undefined });
  });

  it('handles 10 rapid create-delete cycles without corruption', () => {
    const { createWorkspace, deleteWorkspace } = useWorkspaceStore.getState();

    // Create a baseline workspace so delete always has >1
    createWorkspace('Baseline', '#6b7280');

    for (let i = 0; i < 10; i++) {
      createWorkspace(`Stress ${i}`, '#3b82f6');
      const ws = useWorkspaceStore.getState().workspaces;
      const last = ws[ws.length - 1];
      deleteWorkspace(last.id);
    }

    const stressWs = useWorkspaceStore
      .getState()
      .workspaces.filter((w) => w.name.startsWith('Stress'));
    expect(stressWs).toHaveLength(0);
  });

  it('handles rapid rename operations', () => {
    const { createWorkspace, renameWorkspace, deleteWorkspace } = useWorkspaceStore.getState();
    createWorkspace('Rename Me', '#3b82f6');
    const id = useWorkspaceStore.getState().workspaces[0].id;

    for (let i = 0; i < 20; i++) {
      renameWorkspace(id, `Renamed ${i}`);
    }

    expect(
      useWorkspaceStore.getState().workspaces.find((w) => w.id === id)?.name,
    ).toBe('Renamed 19');

    deleteWorkspace(id);
  });

  it('handles rapid reorder operations', () => {
    const { createWorkspace, reorderWorkspaces, deleteWorkspace } = useWorkspaceStore.getState();
    for (let i = 0; i < 5; i++) {
      createWorkspace(`Reorder ${i}`, '#3b82f6');
    }

    for (let i = 0; i < 10; i++) {
      const len = useWorkspaceStore.getState().workspaces.length;
      reorderWorkspaces(0, len - 1);
    }

    expect(useWorkspaceStore.getState().workspaces).toHaveLength(5);

    // Cleanup
    const ids = useWorkspaceStore.getState().workspaces.map((w) => w.id);
    for (const id of ids) {
      deleteWorkspace(id);
    }
  });
});
