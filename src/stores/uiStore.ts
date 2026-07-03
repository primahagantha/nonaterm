import { create } from 'zustand';
import type {
  AppInfo,
  BootstrapStatus,
  DiagnosticsSummary,
  RecoveryStatus,
  WindowInfo,
} from '@/types/ipc';

export type PaneAxisSizes = {
  columns: number[];
  rows: number[];
};

type PaneAxis = 'columns' | 'rows';

export type CreateWorkspaceForm = {
  name: string;
  folder: string;
  accentColor: string;
  shell: string;
};

type UiStore = {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  appInfo: AppInfo | null;
  diagnostics: DiagnosticsSummary | null;
  backendStatus: BootstrapStatus;
  bootstrapError: string | null;
  recoveryStatus: RecoveryStatus | null;
  paneSizes: Record<string, PaneAxisSizes>;
  openWindows: WindowInfo[];
  // Modal states
  createWorkspaceModalOpen: boolean;
  createWorkspaceForm: CreateWorkspaceForm;
  fastLaunchModalOpen: boolean;
  terminalConfigModalOpen: boolean;
  viewMode: 'grid' | 'vertical-tabs';
  setAppInfo: (appInfo: AppInfo) => void;
  setDiagnostics: (diagnostics: DiagnosticsSummary) => void;
  setBackendStatus: (status: BootstrapStatus, error?: string | null) => void;
  setRecoveryStatus: (status: RecoveryStatus | null) => void;
  setPaneSize: (
    workspaceId: string,
    axis: PaneAxis,
    index: number,
    size: number,
  ) => void;
  setOpenWindows: (windows: WindowInfo[]) => void;
  upsertWindow: (info: WindowInfo) => void;
  removeWindow: (label: string) => void;
  // Modal actions
  openCreateWorkspaceModal: (initial?: Partial<CreateWorkspaceForm>) => void;
  closeCreateWorkspaceModal: () => void;
  updateCreateWorkspaceForm: (patch: Partial<CreateWorkspaceForm>) => void;
  openFastLaunchModal: () => void;
  closeFastLaunchModal: () => void;
  openTerminalConfigModal: () => void;
  closeTerminalConfigModal: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setViewMode: (mode: 'grid' | 'vertical-tabs') => void;
  reset: () => void;
};

const initialUiState = {
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  appInfo: null,
  diagnostics: null,
  backendStatus: 'idle' as BootstrapStatus,
  bootstrapError: null,
  recoveryStatus: null,
  paneSizes: {} as Record<string, PaneAxisSizes>,
  openWindows: [] as WindowInfo[],
  createWorkspaceModalOpen: false,
  createWorkspaceForm: {
    name: '',
    folder: '',
    accentColor: '#7c3aed',
    shell: 'powershell.exe',
  } as CreateWorkspaceForm,
  fastLaunchModalOpen: false,
  terminalConfigModalOpen: false,
  viewMode: 'grid' as const,
};

export const useUiStore = create<UiStore>((set) => ({
  ...initialUiState,
  setAppInfo: (appInfo) => set({ appInfo }),
  setDiagnostics: (diagnostics) => set({ diagnostics }),
  setBackendStatus: (backendStatus, bootstrapError = null) =>
    set({ backendStatus, bootstrapError }),
  setRecoveryStatus: (recoveryStatus) => set({ recoveryStatus }),
  setPaneSize: (workspaceId, axis, index, size) =>
    set((state) => {
      const current =
        state.paneSizes[workspaceId] ?? { columns: [], rows: [] };
      const updated = [...current[axis]];
      updated[index] = size;
      return {
        paneSizes: {
          ...state.paneSizes,
          [workspaceId]: {
            ...current,
            [axis]: updated,
          },
        },
      };
    }),
  setOpenWindows: (openWindows) => set({ openWindows }),
  upsertWindow: (info) =>
    set((state) => {
      const without = state.openWindows.filter((w) => w.label !== info.label);
      return { openWindows: [...without, info] };
    }),
  removeWindow: (label) =>
    set((state) => ({
      openWindows: state.openWindows.filter((w) => w.label !== label),
    })),
  // Modal actions
  openCreateWorkspaceModal: (initial) =>
    set({
      createWorkspaceModalOpen: true,
      createWorkspaceForm: {
        ...initialUiState.createWorkspaceForm,
        ...initial,
      },
    }),
  closeCreateWorkspaceModal: () => set({ createWorkspaceModalOpen: false }),
  updateCreateWorkspaceForm: (patch) =>
    set((state) => ({
      createWorkspaceForm: { ...state.createWorkspaceForm, ...patch },
    })),
  openFastLaunchModal: () => set({ fastLaunchModalOpen: true }),
  closeFastLaunchModal: () => set({ fastLaunchModalOpen: false }),
  openTerminalConfigModal: () => set({ terminalConfigModalOpen: true }),
  closeTerminalConfigModal: () => set({ terminalConfigModalOpen: false }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setViewMode: (mode) => set({ viewMode: mode }),
  reset: () => set(initialUiState),
}));
