export type ToolPreset = {
  id: string;
  name: string;
  command: string;
  icon: string;
  color: string;
  description?: string;
};

/**
 * Preset definitions for common CLI coding agents.
 * `icon` is a 1-2 letter initial displayed in a colored badge.
 */
export const TOOL_PRESETS: ToolPreset[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    command: 'claude',
    icon: 'C',
    color: '#d97706',
    description: 'Anthropic Claude coding agent',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    icon: 'OC',
    color: '#8b5cf6',
    description: 'Open source coding agent with 75+ LLM providers',
  },
  {
    id: 'codex',
    name: 'Codex',
    command: 'codex',
    icon: 'Cx',
    color: '#10b981',
    description: 'OpenAI Codex CLI',
  },
  {
    id: 'agy',
    name: 'Antigravity',
    command: 'agy',
    icon: 'Ag',
    color: '#3b82f6',
    description: 'Google Antigravity CLI (Gemini)',
  },
  {
    id: 'cline',
    name: 'Cline',
    command: 'cline',
    icon: 'Cl',
    color: '#06b6d4',
    description: 'Multi-provider coding agent',
  },
  {
    id: 'pi',
    name: 'Pi',
    command: 'pi',
    icon: 'Pi',
    color: '#ec4899',
    description: 'Minimal terminal coding harness',
  },
  {
    id: 'qwen',
    name: 'Qwen Code',
    command: 'qwen',
    icon: 'Qw',
    color: '#f59e0b',
    description: 'Alibaba Qwen coding agent',
  },
  {
    id: 'aider',
    name: 'Aider',
    command: 'aider',
    icon: 'Ai',
    color: '#6366f1',
    description: 'AI pair programming in terminal',
  },
  {
    id: 'enowxai',
    name: 'enowxai start',
    command: 'enowxai start',
    icon: 'En',
    color: '#ef4444',
    description: 'Launch single enowxai worker',
  },
  {
    id: '9router',
    name: '9router',
    command: 'router',
    icon: '9R',
    color: '#dc2626',
    description: 'Launch 9 panes: 1 router + 8 enowxai workers',
  },
];

/**
 * Shell presets for terminal configuration.
 * Platform-aware: returns different shells based on OS.
 */
function getPlatformShellPresets() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  const isMac = ua.includes('mac') || ua.includes('darwin');
  const isLinux = ua.includes('linux');

  if (isMac) {
    return [
      { id: 'zsh', name: 'Zsh', command: '/bin/zsh' },
      { id: 'bash', name: 'Bash', command: '/bin/bash' },
      { id: 'fish', name: 'Fish', command: '/usr/local/bin/fish' },
      { id: 'default', name: 'Default', command: '' },
      { id: 'custom', name: 'Custom', command: '' },
    ] as const;
  }

  if (isLinux) {
    return [
      { id: 'bash', name: 'Bash', command: '/bin/bash' },
      { id: 'zsh', name: 'Zsh', command: '/bin/zsh' },
      { id: 'fish', name: 'Fish', command: '/usr/bin/fish' },
      { id: 'dash', name: 'Dash', command: '/bin/dash' },
      { id: 'default', name: 'Default', command: '' },
      { id: 'custom', name: 'Custom', command: '' },
    ] as const;
  }

  // Windows
  return [
    { id: 'powershell', name: 'PowerShell', command: 'powershell.exe' },
    { id: 'pwsh', name: 'PowerShell 7', command: 'pwsh.exe' },
    { id: 'cmd', name: 'CMD', command: 'cmd.exe' },
    { id: 'gitbash', name: 'Git Bash', command: 'C:\\Program Files\\Git\\bin\\bash.exe' },
    { id: 'wsl', name: 'WSL', command: 'wsl.exe' },
    { id: 'default', name: 'Default', command: '' },
    { id: 'custom', name: 'Custom', command: '' },
  ] as const;
}

export const SHELL_PRESETS = getPlatformShellPresets();

export type ShellPresetId = typeof SHELL_PRESETS[number]['id'];
