/**
 * Centralized error handling for Nonaterm.
 * Covers: disk full, corrupt DB, PTY crash, backend disconnect,
 * memory pressure, state corruption, permission errors, cross-platform issues.
 */

export type ErrorSeverity = 'info' | 'warn' | 'error' | 'critical';

export type AppError = {
  code: string;
  message: string;
  severity: ErrorSeverity;
  recoverable: boolean;
  action?: string;
  timestamp: number;
};

const ERROR_REGISTRY: Record<string, Omit<AppError, 'timestamp'>> = {
  // Disk/storage errors
  DISK_FULL: {
    code: 'DISK_FULL',
    message: 'Storage is full. Cannot save workspace data.',
    severity: 'critical',
    recoverable: true,
    action: 'Free disk space and restart',
  },
  SQLITE_BUSY: {
    code: 'SQLITE_BUSY',
    message: 'Database is locked. Another instance may be running.',
    severity: 'error',
    recoverable: true,
    action: 'Close other Nonaterm instances',
  },
  SQLITE_CORRUPT: {
    code: 'SQLITE_CORRUPT',
    message: 'Database file is corrupted. Settings may be lost.',
    severity: 'critical',
    recoverable: true,
    action: 'Reset settings to defaults',
  },
  STATE_CORRUPT: {
    code: 'STATE_CORRUPT',
    message: 'Workspace data is corrupted. Restoring from backup.',
    severity: 'error',
    recoverable: true,
    action: 'Auto-restoring from snapshot',
  },
  LOCALSTORAGE_QUOTA: {
    code: 'LOCALSTORAGE_QUOTA',
    message: 'Browser storage is full.',
    severity: 'warn',
    recoverable: true,
    action: 'Clear browser data or use desktop app',
  },
  PTY_SPAWN_FAILED: {
    code: 'PTY_SPAWN_FAILED',
    message: 'Failed to start terminal. Shell may not be installed.',
    severity: 'error',
    recoverable: true,
    action: 'Check shell path in settings',
  },
  PTY_CRASH: {
    code: 'PTY_CRASH',
    message: 'Terminal process crashed unexpectedly.',
    severity: 'warn',
    recoverable: true,
    action: 'Auto-restarting...',
  },
  PTY_WRITE_FAILED: {
    code: 'PTY_WRITE_FAILED',
    message: 'Failed to send input to terminal.',
    severity: 'error',
    recoverable: true,
    action: 'Try restarting the pane',
  },
  SHELL_NOT_FOUND: {
    code: 'SHELL_NOT_FOUND',
    message: 'Shell executable not found.',
    severity: 'warn',
    recoverable: true,
    action: 'Using system default shell',
  },
  BACKEND_DISCONNECT: {
    code: 'BACKEND_DISCONNECT',
    message: 'Lost connection to backend.',
    severity: 'error',
    recoverable: true,
    action: 'Attempting reconnection...',
  },
  IPC_TIMEOUT: {
    code: 'IPC_TIMEOUT',
    message: 'Backend is not responding. Operation timed out.',
    severity: 'warn',
    recoverable: true,
    action: 'Retry the operation',
  },
  MEMORY_PRESSURE: {
    code: 'MEMORY_PRESSURE',
    message: 'Running low on memory.',
    severity: 'warn',
    recoverable: true,
    action: 'Close unused terminal panes',
  },
  PERMISSION_DENIED: {
    code: 'PERMISSION_DENIED',
    message: 'Permission denied. Cannot access file or directory.',
    severity: 'error',
    recoverable: true,
    action: 'Check file permissions',
  },
  WINDOW_CREATE_FAILED: {
    code: 'WINDOW_CREATE_FAILED',
    message: 'Failed to create new window.',
    severity: 'error',
    recoverable: true,
    action: 'Try detaching again',
  },
  UPDATE_CHECK_FAILED: {
    code: 'UPDATE_CHECK_FAILED',
    message: 'Failed to check for updates.',
    severity: 'info',
    recoverable: true,
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network request failed.',
    severity: 'warn',
    recoverable: true,
    action: 'Check internet connection',
  },
};

let errorLog: AppError[] = [];
const errorListeners: Set<(error: AppError) => void> = new Set();

export function reportError(
  code: string,
  overrides?: Partial<Omit<AppError, 'timestamp'>>,
): AppError {
  const template = ERROR_REGISTRY[code] ?? {
    code,
    message: overrides?.message ?? 'An unexpected error occurred.',
    severity: 'error' as ErrorSeverity,
    recoverable: false,
  };

  const error: AppError = {
    ...template,
    ...overrides,
    timestamp: Date.now(),
  };

  errorLog.push(error);
  if (errorLog.length > 100) errorLog = errorLog.slice(-50);

  for (const listener of errorListeners) {
    try {
      listener(error);
    } catch { /* ignore */ }
  }

  const logFn =
    error.severity === 'critical' ? console.error
    : error.severity === 'error' ? console.error
    : error.severity === 'warn' ? console.warn
    : console.info;
  logFn(`[Nonaterm:${error.code}] ${error.message}`);

  return error;
}

export function onAppError(listener: (error: AppError) => void): () => void {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}

export function getErrorLog(): AppError[] {
  return [...errorLog];
}

export function clearErrorLog(): void {
  errorLog = [];
}

export async function trySafe<T>(
  fn: () => Promise<T>,
  errorCode: string,
  fallback?: T,
): Promise<[T, null] | [null, AppError]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (e) {
    const error = reportError(errorCode, {
      message: e instanceof Error ? e.message : undefined,
    });
    return fallback !== undefined ? [fallback, null] as [T, null] : [null, error];
  }
}

export function checkMemoryPressure(): boolean {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const mem = (performance as unknown as { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    const usedMB = mem.usedJSHeapSize / (1024 * 1024);
    const limitMB = mem.jsHeapSizeLimit / (1024 * 1024);
    const usage = usedMB / limitMB;
    if (usage > 0.8) {
      reportError('MEMORY_PRESSURE', {
        message: `Memory at ${(usage * 100).toFixed(0)}% (${usedMB.toFixed(0)}MB)`,
      });
      return false;
    }
  }
  return true;
}
