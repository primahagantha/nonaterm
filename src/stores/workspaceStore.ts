import { create } from 'zustand';
import type { WorkspaceSummary } from '@/types/ipc';
import type { Workspace } from '@/types/workspace';

export type RecentlyClosed = {
  workspace: Workspace;
  closedAt: number;
  /** Original index in the workspaces list before close. */
  index: number;
};

type WorkspaceStore = {
  activeWorkspaceId: string;
  workspaces: Workspace[];
  recentlyClosed: RecentlyClosed[];
  hydrateFromSummaries: (summaries: WorkspaceSummary[]) => void;
  hydrateFromSnapshot: (
    activeWorkspaceId: string,
    workspaces: Workspace[],
  ) => void;
  setActiveWorkspace: (workspaceId: string) => void;
  renameWorkspace: (workspaceId: string, name: string) => void;
  deleteWorkspace: (workspaceId: string) => void;
  /** Close a workspace and push it to the recently-closed undo buffer. */
  closeWorkspace: (workspaceId: string) => RecentlyClosed | null;
  /** Restore a previously-closed workspace by its closedAt timestamp. */
  restoreRecentlyClosed: (closedAt: number) => boolean;
  /** Drop a single entry from the recently-closed buffer. */
  dismissRecentlyClosed: (closedAt: number) => void;
  reorderWorkspaces: (fromIndex: number, toIndex: number) => void;
  createWorkspace: (
    name: string,
    accentColor?: string,
    cwd?: string,
    startupCommand?: string,
    shell?: string,
  ) => void;
  removePane: (workspaceId: string, paneId: string) => void;
  addPanesBatch: (
    workspaceId: string,
    panes: Workspace['panes'],
  ) => void;
  setWorkspaceAccent: (workspaceId: string, accentColor: string) => void;
  setWorkspaceFont: (workspaceId: string, fontFamily: string) => void;
  addPaneToWorkspace: (
    workspaceId: string,
    pane: Workspace['panes'][number],
  ) => void;
  updatePane: (
    workspaceId: string,
    paneId: string,
    patch: Partial<Workspace['panes'][number]>,
  ) => void;
};

/** Maximum entries kept in the recently-closed undo buffer. */
const MAX_RECENTLY_CLOSED = 5;

export const defaultWorkspaces: Workspace[] = [
  {
    id: 'workspace-Nonaterm',
    name: 'Nonaterm Core',
    accentColor: '#7c3aed',
    layoutPreset: '1',
    panes: [
      {
        id: 'pane-main',
        title: 'PowerShell',
        cwd: '',
        startupCommand: '',
        shell: 'powershell.exe',
      },
    ],
  },
  {
    id: 'workspace-playground',
    name: 'Playground',
    accentColor: '#0ea5e9',
    layoutPreset: '2',
    panes: [
      { id: 'pane-a', title: 'Scratch A', cwd: '', startupCommand: '' },
      { id: 'pane-b', title: 'Scratch B', cwd: '', startupCommand: '' },
    ],
  },
];

export function paneCountToLayoutPreset(
  paneCount: number,
): Workspace['layoutPreset'] {
  if (paneCount >= 9) {
    return '9';
  }

  if (paneCount >= 6) {
    return '6';
  }

  if (paneCount >= 4) {
    return '4';
  }

  if (paneCount >= 2) {
    return '2';
  }

  return '1';
}

export function summaryToWorkspace(summary: WorkspaceSummary): Workspace {
  const paneCount = Math.max(summary.paneCount, 1);

  return {
    id: summary.id,
    name: summary.name,
    accentColor: summary.accentColor,
    layoutPreset: paneCountToLayoutPreset(paneCount),
    panes: Array.from({ length: paneCount }, (_, index) => ({
      id: `${summary.id}-pane-${index + 1}`,
      title: `Pane ${index + 1}`,
      cwd: '',
      startupCommand: '',
      shell: undefined,
    })),
  };
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  activeWorkspaceId: defaultWorkspaces[0].id,
  workspaces: defaultWorkspaces,
  recentlyClosed: [],
  hydrateFromSummaries: (summaries) =>
    set((state) => {
      if (summaries.length === 0) {
        return state;
      }

      const workspaces = summaries.map(summaryToWorkspace);
      const hasActiveWorkspace = workspaces.some(
        (workspace) => workspace.id === state.activeWorkspaceId,
      );

      return {
        workspaces,
        activeWorkspaceId: hasActiveWorkspace
          ? state.activeWorkspaceId
          : workspaces[0].id,
      };
    }),
  hydrateFromSnapshot: (activeWorkspaceId, workspaces) =>
    set((state) => {
      if (workspaces.length === 0) {
        return state;
      }

      return {
        activeWorkspaceId: workspaces.some(
          (workspace) => workspace.id === activeWorkspaceId,
        )
          ? activeWorkspaceId
          : workspaces[0].id,
        workspaces,
      };
    }),
  setActiveWorkspace: (workspaceId) => set({ activeWorkspaceId: workspaceId }),
  renameWorkspace: (workspaceId, name) =>
    set((state) => ({
      workspaces: state.workspaces.map((ws) =>
        ws.id === workspaceId ? { ...ws, name } : ws,
      ),
    })),
  deleteWorkspace: (workspaceId) =>
    set((state) => {
      if (state.workspaces.length <= 1) {
        return state;
      }

      const workspaces = state.workspaces.filter((ws) => ws.id !== workspaceId);
      const activeWorkspaceId =
        state.activeWorkspaceId === workspaceId
          ? workspaces[0].id
          : state.activeWorkspaceId;

      return { workspaces, activeWorkspaceId };
    }),
  closeWorkspace: (workspaceId) => {
    const state = get();
    if (state.workspaces.length <= 1) {
      // Never close the last workspace — UI should have disabled the
      // action, but guard here too.
      return null;
    }
    const index = state.workspaces.findIndex((ws) => ws.id === workspaceId);
    if (index === -1) {
      return null;
    }
    const closed = state.workspaces[index];
    const closedAt = Date.now();
    const remaining = state.workspaces.filter((ws) => ws.id !== workspaceId);
    const activeWorkspaceId =
      state.activeWorkspaceId === workspaceId
        ? remaining[0]?.id ?? state.activeWorkspaceId
        : state.activeWorkspaceId;
    const recentlyClosed: RecentlyClosed[] = [
      { workspace: closed, closedAt, index },
      ...state.recentlyClosed,
    ].slice(0, MAX_RECENTLY_CLOSED);
    set({ workspaces: remaining, activeWorkspaceId, recentlyClosed });
    return { workspace: closed, closedAt, index };
  },
  restoreRecentlyClosed: (closedAt) => {
    const state = get();
    const entry = state.recentlyClosed.find((e) => e.closedAt === closedAt);
    if (!entry) {
      return false;
    }
    // Don't restore if a workspace with the same id already exists.
    if (state.workspaces.some((ws) => ws.id === entry.workspace.id)) {
      set({
        recentlyClosed: state.recentlyClosed.filter(
          (e) => e.closedAt !== closedAt,
        ),
      });
      return false;
    }
    const next = [...state.workspaces];
    const insertAt = Math.min(entry.index, next.length);
    next.splice(insertAt, 0, entry.workspace);
    set({
      workspaces: next,
      activeWorkspaceId: entry.workspace.id,
      recentlyClosed: state.recentlyClosed.filter(
        (e) => e.closedAt !== closedAt,
      ),
    });
    return true;
  },
  dismissRecentlyClosed: (closedAt) =>
    set((state) => ({
      recentlyClosed: state.recentlyClosed.filter(
        (e) => e.closedAt !== closedAt,
      ),
    })),
  reorderWorkspaces: (fromIndex, toIndex) =>
    set((state) => {
      if (
        fromIndex < 0 ||
        fromIndex >= state.workspaces.length ||
        toIndex < 0 ||
        toIndex >= state.workspaces.length ||
        fromIndex === toIndex
      ) {
        return state;
      }

      const workspaces = [...state.workspaces];
      const [moved] = workspaces.splice(fromIndex, 1);
      workspaces.splice(toIndex, 0, moved);
      return { workspaces };
    }),
  createWorkspace: (name, accentColor = '#7c3aed', cwd = '', startupCommand = '', shell) =>
    set((state) => {
      const id = `workspace-${crypto.randomUUID()}`;
      return {
        workspaces: [
          ...state.workspaces,
          {
            id,
            name: name.trim() || 'New Workspace',
            accentColor,
            layoutPreset: '1',
            panes: [
              {
                id: `${id}-pane-1`,
                title: startupCommand ? startupCommand.split(/\s+/)[0] : 'Pane 1',
                cwd,
                startupCommand,
                ...(shell ? { shell } : {}),
              },
            ],
          },
        ],
        activeWorkspaceId: id,
      };
    }),
  setWorkspaceAccent: (workspaceId, accentColor) =>
    set((state) => ({
      workspaces: state.workspaces.map((ws) =>
        ws.id === workspaceId ? { ...ws, accentColor } : ws,
      ),
    })),
  setWorkspaceFont: (workspaceId, fontFamily) =>
    set((state) => ({
      workspaces: state.workspaces.map((ws) =>
        ws.id === workspaceId ? { ...ws, fontFamily } : ws,
      ),
    })),
  removePane: (workspaceId, paneId) =>
    set((state) => ({
      workspaces: state.workspaces.map((workspace) =>
        workspace.id !== workspaceId
          ? workspace
          : {
              ...workspace,
              panes: workspace.panes.filter((pane) => pane.id !== paneId),
              layoutPreset: paneCountToLayoutPreset(
                Math.max(workspace.panes.filter((p) => p.id !== paneId).length, 1),
              ),
            },
      ),
    })),
  addPanesBatch: (workspaceId, panes) =>
    set((state) => ({
      workspaces: state.workspaces.map((workspace) => {
        if (workspace.id !== workspaceId) {
          return workspace;
        }
        const room = 9 - workspace.panes.length;
        if (room <= 0) {
          return workspace;
        }
        const accepted = panes.slice(0, room);
        const next = [...workspace.panes, ...accepted];
        return {
          ...workspace,
          panes: next,
          layoutPreset: paneCountToLayoutPreset(next.length),
        };
      }),
    })),
  addPaneToWorkspace: (workspaceId, pane) =>
    set((state) => ({
      workspaces: state.workspaces.map((workspace) => {
        if (workspace.id !== workspaceId) {
          return workspace;
        }
        if (workspace.panes.length >= 9) {
          return workspace;
        }
        const next = [...workspace.panes, pane];
        return {
          ...workspace,
          panes: next,
          layoutPreset: paneCountToLayoutPreset(next.length),
        };
      }),
    })),
  updatePane: (workspaceId, paneId, patch) =>
    set((state) => ({
      workspaces: state.workspaces.map((workspace) =>
        workspace.id !== workspaceId
          ? workspace
          : {
              ...workspace,
              panes: workspace.panes.map((pane) =>
                pane.id === paneId ? { ...pane, ...patch } : pane,
              ),
            },
      ),
    })),
}));
