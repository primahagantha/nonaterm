import {
  defaultWorkspaces,
  paneCountToLayoutPreset,
  summaryToWorkspace,
  useWorkspaceStore,
} from '@/stores/workspaceStore';

describe('workspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      activeWorkspaceId: defaultWorkspaces[0].id,
      workspaces: defaultWorkspaces,
    });
  });

  it('maps pane counts to supported layout presets', () => {
    expect(paneCountToLayoutPreset(1)).toBe('1');
    expect(paneCountToLayoutPreset(2)).toBe('2');
    expect(paneCountToLayoutPreset(4)).toBe('4');
    expect(paneCountToLayoutPreset(6)).toBe('6');
    expect(paneCountToLayoutPreset(9)).toBe('9');
    expect(paneCountToLayoutPreset(99)).toBe('9');
  });

  it('hydrates summaries into pane placeholders and preserves active workspace when possible', () => {
    const initialActiveWorkspaceId =
      useWorkspaceStore.getState().activeWorkspaceId;

    useWorkspaceStore.getState().hydrateFromSummaries([
      {
        id: 'workspace-Nonaterm',
        name: 'Nonaterm Core',
        accentColor: '#7c3aed',
        paneCount: 4,
      },
      {
        id: 'workspace-scratch',
        name: 'Scratch',
        accentColor: '#22c55e',
        paneCount: 1,
      },
    ]);

    const state = useWorkspaceStore.getState();

    expect(state.activeWorkspaceId).toBe(initialActiveWorkspaceId);
    expect(state.workspaces).toHaveLength(2);
    expect(state.workspaces[0].panes).toHaveLength(4);
    expect(state.workspaces[1].layoutPreset).toBe('1');
    expect(state.workspaces[1].panes[0].cwd).toBe('');
  });

  it('switches active workspace id directly', () => {
    useWorkspaceStore.getState().setActiveWorkspace('workspace-playground');

    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(
      'workspace-playground',
    );
  });

  it('renames a workspace', () => {
    useWorkspaceStore.getState().renameWorkspace('workspace-Nonaterm', 'Renamed');

    expect(useWorkspaceStore.getState().workspaces[0].name).toBe('Renamed');
  });

  it('deletes a workspace and switches active if needed', () => {
    useWorkspaceStore.getState().setActiveWorkspace('workspace-playground');
    useWorkspaceStore.getState().deleteWorkspace('workspace-playground');

    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toHaveLength(1);
    expect(state.activeWorkspaceId).toBe('workspace-Nonaterm');
  });

  it('refuses to delete the last workspace', () => {
    useWorkspaceStore.getState().deleteWorkspace('workspace-Nonaterm');
    useWorkspaceStore.getState().deleteWorkspace('workspace-playground');

    expect(useWorkspaceStore.getState().workspaces).toHaveLength(1);
  });

  it('reorders workspaces', () => {
    useWorkspaceStore.getState().reorderWorkspaces(0, 1);

    expect(useWorkspaceStore.getState().workspaces[0].id).toBe(
      'workspace-playground',
    );
  });

  it('creates a new workspace and sets it active', () => {
    const before = useWorkspaceStore.getState().workspaces.length;
    useWorkspaceStore.getState().createWorkspace('Test WS', '#ff0000');

    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toHaveLength(before + 1);
    expect(state.workspaces[before].name).toBe('Test WS');
    expect(state.activeWorkspaceId).toBe(state.workspaces[before].id);
  });

  it('creates at least one pane when backend reports zero panes', () => {
    const workspace = summaryToWorkspace({
      id: 'workspace-empty',
      name: 'Empty',
      accentColor: '#ffffff',
      paneCount: 0,
    });

    expect(workspace.layoutPreset).toBe('1');
    expect(workspace.panes).toHaveLength(1);
  });

  it('hydrates from recovery snapshot', () => {
    const recovered = summaryToWorkspace({
      id: 'workspace-recovered',
      name: 'Recovered',
      accentColor: '#22c55e',
      paneCount: 2,
    });

    useWorkspaceStore
      .getState()
      .hydrateFromSnapshot('workspace-recovered', [recovered]);

    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(
      'workspace-recovered',
    );
    expect(useWorkspaceStore.getState().workspaces[0].name).toBe('Recovered');
  });
});
