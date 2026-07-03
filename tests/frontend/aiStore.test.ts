import { describe, it, expect, beforeEach } from 'vitest';
import { useAiStore } from '@/stores/aiStore';

describe('AI Store', () => {
  beforeEach(() => {
    useAiStore.setState({
      providers: [],
      activeProviderId: null,
      systemPrompt: '',
      maxTokens: 4096,
      temperature: 0.7,
    });
  });

  it('has providers field in store', () => {
    expect(useAiStore.getState().providers).toBeDefined();
    expect(Array.isArray(useAiStore.getState().providers)).toBe(true);
  });

  it('addProvider adds a provider', () => {
    useAiStore.getState().addProvider({
      id: 'openai',
      name: 'OpenAI',
      apiKey: 'sk-test',
      model: 'gpt-4o',
      enabled: true,
    });
    const providers = useAiStore.getState().providers;
    expect(providers).toHaveLength(1);
    expect(providers[0].id).toBe('openai');
    expect(providers[0].name).toBe('OpenAI');
  });

  it('removeProvider removes by id', () => {
    useAiStore.getState().addProvider({
      id: 'openai',
      name: 'OpenAI',
      apiKey: 'sk-test',
      model: 'gpt-4o',
      enabled: true,
    });
    useAiStore.getState().removeProvider('openai');
    expect(useAiStore.getState().providers).toHaveLength(0);
  });

  it('updateProvider updates fields', () => {
    useAiStore.getState().addProvider({
      id: 'openai',
      name: 'OpenAI',
      apiKey: 'sk-test',
      model: 'gpt-4o',
      enabled: true,
    });
    useAiStore.getState().updateProvider('openai', { model: 'gpt-4o-mini' });
    expect(useAiStore.getState().providers[0].model).toBe('gpt-4o-mini');
  });

  it('setActiveProvider sets the active provider', () => {
    useAiStore.getState().addProvider({
      id: 'openai',
      name: 'OpenAI',
      apiKey: 'sk-test',
      model: 'gpt-4o',
      enabled: true,
    });
    useAiStore.getState().setActiveProvider('openai');
    expect(useAiStore.getState().activeProviderId).toBe('openai');
  });

  it('setSystemPrompt updates the system prompt', () => {
    useAiStore.getState().setSystemPrompt('You are a helpful assistant.');
    expect(useAiStore.getState().systemPrompt).toBe('You are a helpful assistant.');
  });

  it('setMaxTokens updates max tokens', () => {
    useAiStore.getState().setMaxTokens(8192);
    expect(useAiStore.getState().maxTokens).toBe(8192);
  });

  it('setTemperature updates temperature', () => {
    useAiStore.getState().setTemperature(0.5);
    expect(useAiStore.getState().temperature).toBe(0.5);
  });

  it('persists to localStorage', () => {
    useAiStore.getState().addProvider({
      id: 'openai',
      name: 'OpenAI',
      apiKey: 'sk-test',
      model: 'gpt-4o',
      enabled: true,
    });
    const stored = JSON.parse(localStorage.getItem('Nonaterm:ai-config') || '{}');
    expect(stored.providers).toHaveLength(1);
  });
});
