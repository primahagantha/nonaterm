import { act } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';

describe('workspaceStore extra actions', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      activeWorkspaceId: 'workspace-test',
      workspaces: [
        {
          id: 'workspace-test',
          name: 'Test',
          accentColor: '#7c3aed',
          layoutPreset: '1',
          panes: [
            { id: 'p1', title: 'P1', cwd: '', startupCommand: '' },
          ],
        },
      ],
    });
  });

  it('createWorkspace accepts a cwd and labels by folder name', () => {
    act(() => {
      useWorkspaceStore.getState().createWorkspace('Ignored', '#06b6d4', 'C:/work/app');
    });
    const next = useWorkspaceStore.getState();
    const created = next.workspaces.at(-1);
    expect(created?.panes[0]?.cwd).toBe('C:/work/app');
    expect(next.activeWorkspaceId).toBe(created?.id);
  });

  it('removePane shrinks the layout preset', () => {
    act(() => {
      const add = useWorkspaceStore.getState().addPaneToWorkspace;
      add('workspace-test', { id: 'p2', title: 'P2', cwd: '', startupCommand: '' });
      add('workspace-test', { id: 'p3', title: 'P3', cwd: '', startupCommand: '' });
      add('workspace-test', { id: 'p4', title: 'P4', cwd: '', startupCommand: '' });
    });
    expect(useWorkspaceStore.getState().workspaces[0].panes.length).toBe(4);
    act(() => {
      useWorkspaceStore.getState().removePane('workspace-test', 'p2');
    });
    const panes = useWorkspaceStore.getState().workspaces[0].panes;
    expect(panes.length).toBe(3);
    expect(panes.find((p) => p.id === 'p2')).toBeUndefined();
  });

  it('addPanesBatch caps at 9 panes and updates preset', () => {
    act(() => {
      useWorkspaceStore.setState({
        workspaces: [
          {
            id: 'workspace-test',
            name: 'Test',
            accentColor: '#7c3aed',
            layoutPreset: '1',
            panes: [],
          },
        ],
      });
      useWorkspaceStore
        .getState()
        .addPanesBatch('workspace-test', [
          { id: 'a', title: 'A', cwd: '', startupCommand: '' },
          { id: 'b', title: 'B', cwd: '', startupCommand: '' },
          { id: 'c', title: 'C', cwd: '', startupCommand: '' },
          { id: 'd', title: 'D', cwd: '', startupCommand: '' },
          { id: 'e', title: 'E', cwd: '', startupCommand: '' },
          { id: 'f', title: 'F', cwd: '', startupCommand: '' },
          { id: 'g', title: 'G', cwd: '', startupCommand: '' },
          { id: 'h', title: 'H', cwd: '', startupCommand: '' },
          { id: 'i', title: 'I', cwd: '', startupCommand: '' },
          { id: 'j', title: 'J', cwd: '', startupCommand: '' },
          { id: 'k', title: 'K', cwd: '', startupCommand: '' },
        ]);
    });
    const panes = useWorkspaceStore.getState().workspaces[0].panes;
    expect(panes.length).toBe(9);
    expect(useWorkspaceStore.getState().workspaces[0].layoutPreset).toBe('9');
  });

  it('setWorkspaceAccent changes only the target workspace', () => {
    act(() => {
      useWorkspaceStore.getState().setWorkspaceAccent('workspace-test', '#22c55e');
    });
    expect(useWorkspaceStore.getState().workspaces[0].accentColor).toBe('#22c55e');
  });

  it('addPaneToWorkspace refuses when already at 9 panes', () => {
    act(() => {
      const ids = Array.from({ length: 9 }, (_, i) => `x${i}`);
      useWorkspaceStore.setState({
        workspaces: [
          {
            id: 'workspace-test',
            name: 'Test',
            accentColor: '#7c3aed',
            layoutPreset: '9',
            panes: ids.map((id) => ({ id, title: id, cwd: '', startupCommand: '' })),
          },
        ],
      });
      useWorkspaceStore.getState().addPaneToWorkspace('workspace-test', {
        id: 'overflow',
        title: 'X',
        cwd: '',
        startupCommand: '',
      });
    });
    expect(useWorkspaceStore.getState().workspaces[0].panes.length).toBe(9);
  });
});
