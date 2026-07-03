/**
 * Universal command history (PRD Section 9 - Wave Terminal).
 * Stores commands across all terminals and workspaces for quick search.
 */

export type HistoryEntry = {
  command: string;
  workspaceId: string;
  paneId: string;
  timestamp: number;
};

const STORAGE_KEY = 'nonaterm:command-history';
const MAX_ENTRIES = 500;

let history: HistoryEntry[] = [];

function load(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      history = JSON.parse(saved);
    }
  } catch {
    history = [];
  }
}

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_ENTRIES)));
  } catch {
    // quota exceeded
  }
}

export function addToHistory(command: string, workspaceId: string, paneId: string): void {
  if (!command.trim()) return;
  history.push({
    command: command.trim(),
    workspaceId,
    paneId,
    timestamp: Date.now(),
  });
  if (history.length > MAX_ENTRIES) {
    history = history.slice(-MAX_ENTRIES);
  }
  save();
}

export function searchHistory(query: string): HistoryEntry[] {
  if (!history.length) load();
  const q = query.toLowerCase();
  if (!q) return history.slice(-20).reverse();
  return history
    .filter((e) => e.command.toLowerCase().includes(q))
    .reverse()
    .slice(0, 20);
}

export function getRecentCommands(limit = 10): string[] {
  if (!history.length) load();
  const seen = new Set<string>();
  const result: string[] = [];
  for (let i = history.length - 1; i >= 0 && result.length < limit; i--) {
    const cmd = history[i].command;
    if (!seen.has(cmd)) {
      seen.add(cmd);
      result.push(cmd);
    }
  }
  return result;
}

export function clearHistory(): void {
  history = [];
  save();
}
