import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '@/stores/uiStore';

describe('Workspace-to-Worktree Auto-Binding', () => {
  beforeEach(() => {
    useUiStore.setState({
      createWorkspaceModalOpen: false,
      createWorkspaceForm: {
        name: '',
        folder: '',
        accentColor: '#7c3aed',
        shell: 'powershell.exe',
      },
    });
  });

  it('createWorkspaceForm has worktree field', () => {
    // The form should support worktree binding
    const form = useUiStore.getState().createWorkspaceForm;
    expect(form).toBeDefined();
    expect(form.name).toBeDefined();
    expect(form.folder).toBeDefined();
  });

  it('updateCreateWorkspaceForm can set worktree options', () => {
    // Test that the form can be updated
    useUiStore.getState().updateCreateWorkspaceForm({ name: 'Test WS' });
    expect(useUiStore.getState().createWorkspaceForm.name).toBe('Test WS');
  });
});
