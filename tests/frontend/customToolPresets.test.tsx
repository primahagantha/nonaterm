import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';

describe('Custom Tool Presets', () => {
  beforeEach(() => {
    useSettingsStore.setState({ customTools: [] });
  });

  it('has customTools field in store', () => {
    expect(useSettingsStore.getState().customTools).toBeDefined();
    expect(Array.isArray(useSettingsStore.getState().customTools)).toBe(true);
  });

  it('addCustomTool adds a tool', () => {
    useSettingsStore.getState().addCustomTool({
      name: 'My Agent',
      command: 'my-agent',
      icon: 'MA',
      color: '#3b82f6',
    });
    const tools = useSettingsStore.getState().customTools;
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('My Agent');
    expect(tools[0].command).toBe('my-agent');
    expect(tools[0].icon).toBe('MA');
    expect(tools[0].color).toBe('#3b82f6');
  });

  it('addCustomTool generates UUID id', () => {
    useSettingsStore.getState().addCustomTool({
      name: 'Test',
      command: 'test',
      icon: 'T',
      color: '#fff',
    });
    const tool = useSettingsStore.getState().customTools[0];
    expect(tool.id).toBeDefined();
    expect(tool.id.length).toBeGreaterThan(0);
  });

  it('addCustomTool adds multiple tools', () => {
    useSettingsStore.getState().addCustomTool({
      name: 'Tool 1',
      command: 't1',
      icon: 'T1',
      color: '#f00',
    });
    useSettingsStore.getState().addCustomTool({
      name: 'Tool 2',
      command: 't2',
      icon: 'T2',
      color: '#0f0',
    });
    expect(useSettingsStore.getState().customTools).toHaveLength(2);
  });

  it('removeCustomTool removes by id', () => {
    useSettingsStore.getState().addCustomTool({
      name: 'Test',
      command: 'test',
      icon: 'T',
      color: '#fff',
    });
    const id = useSettingsStore.getState().customTools[0].id;
    useSettingsStore.getState().removeCustomTool(id);
    expect(useSettingsStore.getState().customTools).toHaveLength(0);
  });

  it('updateCustomTool updates fields', () => {
    useSettingsStore.getState().addCustomTool({
      name: 'Old Name',
      command: 'old',
      icon: 'ON',
      color: '#f00',
    });
    const id = useSettingsStore.getState().customTools[0].id;
    useSettingsStore.getState().updateCustomTool(id, {
      name: 'New Name',
      icon: 'NN',
    });
    const tool = useSettingsStore.getState().customTools[0];
    expect(tool.name).toBe('New Name');
    expect(tool.icon).toBe('NN');
    expect(tool.command).toBe('old'); // unchanged
  });

  it('customTools persists to localStorage', () => {
    useSettingsStore.getState().addCustomTool({
      name: 'Persist',
      command: 'persist',
      icon: 'PE',
      color: '#00f',
    });
    const stored = JSON.parse(localStorage.getItem('Nonaterm:settings:v1') || '{}');
    expect(stored.customTools).toHaveLength(1);
    expect(stored.customTools[0].name).toBe('Persist');
  });
});
