export type TerminalSessionState = {
  paneId: string;
  workspaceId?: string;
  isConnected: boolean;
  status: 'idle' | 'spawning' | 'running' | 'exited' | 'error';
  sessionId?: string;
  processId?: number;
  lastOutputAt?: string;
  exitCode?: number | null;
  errorMessage?: string;
};

export type PtySessionInfo = {
  sessionId: string;
  workspaceId: string;
  paneId: string;
  shell: string;
  cwd: string;
  rows: number;
  cols: number;
  processId?: number;
};

export type PtySpawnRequest = {
  workspaceId: string;
  paneId: string;
  shell?: string;
  cwd?: string;
  rows?: number;
  cols?: number;
};

export type PtyOutputEvent = {
  workspaceId: string;
  paneId: string;
  chunk: string;
};

export type PtyExitEvent = {
  workspaceId: string;
  paneId: string;
  exitCode: number | null;
};
