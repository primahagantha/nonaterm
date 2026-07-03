import { create } from 'zustand';
import type { TerminalSessionState } from '@/types/terminal';

type TerminalStore = {
  sessions: Record<string, TerminalSessionState>;
  startSession: (paneId: string, workspaceId: string) => void;
  attachSession: (paneId: string, session: Omit<TerminalSessionState, 'paneId'>) => void;
  markOutput: (paneId: string) => void;
  markExited: (paneId: string, exitCode: number | null) => void;
  markError: (paneId: string, errorMessage: string) => void;
  removeSession: (paneId: string) => void;
};

export const useTerminalStore = create<TerminalStore>((set) => ({
  sessions: {},
  startSession: (paneId, workspaceId) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [paneId]: {
          paneId,
          workspaceId,
          isConnected: false,
          status: 'spawning',
        },
      },
    })),
  attachSession: (paneId, session) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [paneId]: {
          paneId,
          ...session,
        },
      },
    })),
  markOutput: (paneId) =>
    set((state) => {
      const session = state.sessions[paneId];
      if (!session) {
        return state;
      }

      return {
        sessions: {
          ...state.sessions,
          [paneId]: {
            ...session,
            lastOutputAt: new Date().toISOString(),
          },
        },
      };
    }),
  markExited: (paneId, exitCode) =>
    set((state) => {
      const session = state.sessions[paneId];
      if (!session) {
        return state;
      }

      return {
        sessions: {
          ...state.sessions,
          [paneId]: {
            ...session,
            isConnected: false,
            status: 'exited',
            exitCode,
          },
        },
      };
    }),
  markError: (paneId, errorMessage) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [paneId]: {
          ...(state.sessions[paneId] ?? { paneId, isConnected: false, status: 'error' }),
          paneId,
          status: 'error',
          isConnected: false,
          errorMessage,
        },
      },
    })),
  removeSession: (paneId) =>
    set((state) => {
      const sessions = { ...state.sessions };
      delete sessions[paneId];
      return { sessions };
    }),
}));
