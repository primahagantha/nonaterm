import { useState } from 'react';
import { useAiStore, type AIProvider } from '@/stores/aiStore';
import { getAvailableModels } from '@/lib/aiClient';

/**
 * AI Settings Panel for configuring multiple AI providers.
 * Supports OpenAI, Anthropic, Google, and local models.
 */
export function AISettingsPanel() {
  const providers = useAiStore((s) => s.providers);
  const activeProviderId = useAiStore((s) => s.activeProviderId);
  const systemPrompt = useAiStore((s) => s.systemPrompt);
  const maxTokens = useAiStore((s) => s.maxTokens);
  const temperature = useAiStore((s) => s.temperature);
  const addProvider = useAiStore((s) => s.addProvider);
  const removeProvider = useAiStore((s) => s.removeProvider);
  const updateProvider = useAiStore((s) => s.updateProvider);
  const setActiveProvider = useAiStore((s) => s.setActiveProvider);
  const setSystemPrompt = useAiStore((s) => s.setSystemPrompt);
  const setMaxTokens = useAiStore((s) => s.setMaxTokens);
  const setTemperature = useAiStore((s) => s.setTemperature);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState<Partial<AIProvider>>({
    id: 'openai',
    name: 'OpenAI',
    model: 'gpt-4o',
    enabled: true,
  });
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  const handleAddProvider = () => {
    if (!newProvider.id || !newProvider.apiKey) return;
    addProvider(newProvider as AIProvider);
    setShowAddForm(false);
    setNewProvider({ id: 'openai', name: 'OpenAI', model: 'gpt-4o', enabled: true });
  };

  const toggleApiKeyVisibility = (id: string) => {
    setShowApiKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="ai-settings">
      <span className="options-menu__label">AI Providers</span>
      <p className="options-menu__hint">
        Configure AI providers for code assistance. Supports OpenAI, Anthropic, Google, and local models.
      </p>

      {providers.length === 0 && !showAddForm ? (
        <p className="ai-settings__empty">No AI providers configured.</p>
      ) : null}

      {providers.map((provider) => (
        <div key={provider.id} className="ai-settings__provider">
          <div className="ai-settings__provider-header">
            <label className="ai-settings__provider-toggle">
              <input
                type="checkbox"
                checked={provider.enabled}
                onChange={(e) => updateProvider(provider.id, { enabled: e.target.checked })}
              />
              <span>{provider.name}</span>
            </label>
            <div className="ai-settings__provider-actions">
              <button
                type="button"
                className={`btn btn--sm ${activeProviderId === provider.id ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setActiveProvider(provider.id)}
              >
                {activeProviderId === provider.id ? 'Active' : 'Use'}
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost btn--danger"
                onClick={() => removeProvider(provider.id)}
              >
                ✕
              </button>
            </div>
          </div>
          <div className="ai-settings__provider-fields">
            <label className="ai-settings__field">
              <span>Model</span>
              <select
                value={provider.model}
                onChange={(e) => updateProvider(provider.id, { model: e.target.value })}
              >
                {getAvailableModels(provider.id).map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </label>
            <label className="ai-settings__field">
              <span>API Key</span>
              <div className="ai-settings__apikey-row">
                <input
                  type={showApiKey[provider.id] ? 'text' : 'password'}
                  value={provider.apiKey}
                  onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
                  placeholder="sk-..."
                />
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => toggleApiKeyVisibility(provider.id)}
                >
                  {showApiKey[provider.id] ? '🙈' : '👁'}
                </button>
              </div>
            </label>
            <label className="ai-settings__field">
              <span>Base URL (optional)</span>
              <input
                type="text"
                value={provider.baseUrl ?? ''}
                onChange={(e) => updateProvider(provider.id, { baseUrl: e.target.value || undefined })}
                placeholder="https://api.openai.com"
              />
            </label>
          </div>
        </div>
      ))}

      {showAddForm ? (
        <div className="ai-settings__add-form">
          <div className="ai-settings__field">
            <span>Provider</span>
            <select
              value={newProvider.id}
              onChange={(e) => {
                const id = e.target.value;
                const name = id === 'openai' ? 'OpenAI' : id === 'anthropic' ? 'Anthropic' : id === 'google' ? 'Google' : 'Local';
                setNewProvider({ ...newProvider, id, name });
              }}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="local">Local (Ollama)</option>
            </select>
          </div>
          <div className="ai-settings__field">
            <span>API Key</span>
            <input
              type="password"
              value={newProvider.apiKey ?? ''}
              onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleAddProvider}
              disabled={!newProvider.apiKey}
            >
              Add provider
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={() => setShowAddForm(true)}
        >
          + Add AI provider
        </button>
      )}

      <span className="options-menu__label" style={{ marginTop: '1rem' }}>AI Settings</span>
      <label className="ai-settings__field">
        <span>System prompt</span>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={3}
          placeholder="You are a helpful coding assistant."
        />
      </label>
      <div className="slider-row">
        <label className="options-menu__hint">Max tokens</label>
        <input
          type="range"
          className="slider"
          min={1024}
          max={16384}
          step={1024}
          value={maxTokens}
          onChange={(e) => setMaxTokens(Number(e.target.value))}
        />
        <span className="slider-row__value">{maxTokens}</span>
      </div>
      <div className="slider-row">
        <label className="options-menu__hint">Temperature</label>
        <input
          type="range"
          className="slider"
          min={0}
          max={2}
          step={0.1}
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
        />
        <span className="slider-row__value">{temperature}</span>
      </div>
    </div>
  );
}
