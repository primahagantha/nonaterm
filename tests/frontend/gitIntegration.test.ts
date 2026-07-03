import { describe, it, expect } from 'vitest';

describe('Git Integration', () => {
  it('git commands are defined in tauri.ts', async () => {
    // Verify the git command wrappers exist
    const tauri = await import('@/lib/tauri');
    expect(tauri.gitDetectRepo).toBeDefined();
    expect(tauri.gitListBranches).toBeDefined();
    expect(tauri.gitListWorktrees).toBeDefined();
    expect(tauri.gitCreateWorktree).toBeDefined();
  });
});
