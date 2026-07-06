import { useState } from 'react';
import { useAiStore, type AIProvider } from '@/stores/aiStore';
import { getAvailableModels } from '@/lib/aiClient';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="settings-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="settings-toggle__track"><span className="settings-toggle__thumb" /></span>
      {label ? <span className="settings-toggle__label">{label}</span> : null}
    </label>
  );
}

function SettingsCard({ title, description, icon, children, className = '' }: { title: string; description?: string; icon?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`settings-card ${className}`}>
      <div className="settings-card__header">
        {icon ? <span className="settings-card__icon">{icon}</span> : null}
        <div>
          <h3 className="settings-card__title">{title}</h3>
          {description ? <p className="settings-card__desc">{description}</p> : null}
        </div>
      </div>
      <div className="settings-card__body">{children}</div>
    </div>
  );
}

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
    id: 'openai', name: 'OpenAI', model: 'gpt-4o', enabled: true,
  });
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  const handleAddProvider = () => {
    if (!newProvider.id || !newProvider.apiKey) return;
    addProvider(newProvider as AIProvider);
    setShowAddForm(false);
    setNewProvider({ id: 'openai', name: 'OpenAI', model: 'gpt-4o', enabled: true });
  };

  const PROVIDER_PRESETS = [
    { id: 'openai', name: 'OpenAI', model: 'gpt-4o', icon: '🟢' },
    { id: 'anthropic', name: 'Anthropic', model: 'claude-sonnet-5', icon: '🟠' },
    { id: 'google', name: 'Google', model: 'gemini-2.0-flash', icon: '🔵' },
    { id: 'local', name: 'Ollama (local)', model: 'llama3', icon: '🦙' },
  ];

  return (
    <div className="settings-section-grid">
      <SettingsCard title="AI Providers" icon="🤖" description="Configure AI providers for code assistance. Supports OpenAI, Anthropic, Google, and local models.">
        {providers.length === 0 && !showAddForm ? (
          <p className="settings-empty">No AI providers configured. Add one below.</p>
        ) : null}

        {providers.map((provider) => (
          <div key={provider.id} className="settings-list__item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Toggle checked={provider.enabled} onChange={(v) => updateProvider(provider.id, { enabled: v })} />
                <span className="settings-list__name">{provider.name}</span>
                <code className="settings-list__code">{provider.model}</code>
                {activeProviderId === provider.id ? (
                  <span style={{ fontSize: '0.7rem', color: 'var(--tw-accent)', fontWeight: 600 }}>ACTIVE</span>
                ) : null}
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button type="button" className={`btn btn--sm ${activeProviderId === provider.id ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setActiveProvider(provider.id)}>
                  {activeProviderId === provider.id ? '✓ Active' : 'Set Active'}
                </button>
                <button type="button" className="btn btn--sm btn--ghost btn--danger" onClick={() => removeProvider(provider.id)} title="Remove">✕</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <label className="settings-field" style={{ flex: 1, minWidth: 120 }}>
                <span className="settings-label">Model</span>
                <select className="settings-select" value={provider.model} onChange={(e) => updateProvider(provider.id, { model: e.target.value })}>
                  {getAvailableModels(provider.id).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <label className="settings-field" style={{ flex: 1, minWidth: 120 }}>
                <span className="settings-label">API Key</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <input type={showApiKey[provider.id] ? 'text' : 'password'} className="settings-input" value={provider.apiKey} onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })} placeholder="sk-..." />
                  <button type="button" className="btn btn--sm btn--ghost" onClick={() => setShowApiKey((p) => ({ ...p, [provider.id]: !p[provider.id] }))}>
                    {showApiKey[provider.id] ? '🙈' : '👁'}
                  </button>
                </div>
              </label>
            </div>
            <label className="settings-field">
              <span className="settings-label">Base URL (optional)</span>
              <input type="text" className="settings-input" value={provider.baseUrl ?? ''} onChange={(e) => updateProvider(provider.id, { baseUrl: e.target.value || undefined })} placeholder="https://api.openai.com" />
            </label>
          </div>
        ))}

        {showAddForm ? (
          <div style={{ marginTop: '0.5rem', padding: '0.75rem', border: '1px solid var(--tw-panel-border)', borderRadius: 'var(--tw-radius-sm)' }}>
            <div className="settings-form-row">
              <label className="settings-field">
                <span className="settings-label">Provider</span>
                <select className="settings-select" value={newProvider.id} onChange={(e) => {
                  const id = e.target.value;
                  const preset = PROVIDER_PRESETS.find((p) => p.id === id);
                  setNewProvider({ ...newProvider, id, name: preset?.name ?? id, model: preset?.model ?? '' });
                }}>
                  {PROVIDER_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                </select>
              </label>
              <label className="settings-field">
                <span className="settings-label">API Key</span>
                <input type="password" className="settings-input" value={newProvider.apiKey ?? ''} onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })} placeholder="sk-..." />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn--primary btn--sm" onClick={handleAddProvider} disabled={!newProvider.apiKey}>Add Provider</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn--sm btn--primary" onClick={() => setShowAddForm(true)} style={{ marginTop: '0.5rem' }}>+ Add AI Provider</button>
        )}
      </SettingsCard>

      <SettingsCard title="AI Parameters" icon="⚙" description="Configure system prompt, token limits, and temperature.">
        <label className="settings-field">
          <span className="settings-label">System Prompt</span>
          <textarea className="settings-textarea" rows={4} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="You are a helpful coding assistant." />
        </label>
        <label className="settings-field">
          <span className="settings-label">Max Tokens: {maxTokens}</span>
          <input type="range" min={1024} max={32768} step={1024} value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} />
        </label>
        <label className="settings-field">
          <span className="settings-label">Temperature: {temperature.toFixed(1)}</span>
          <input type="range" min={0} max={2} step={0.1} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
          <p className="settings-hint">0 = deterministic, 1 = balanced, 2 = creative</p>
        </label>
      </SettingsCard>

      <SettingsCard title="Quick Add" icon="⚡" description="One-click add popular AI providers.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
          {PROVIDER_PRESETS.map((preset) => {
            const exists = providers.some((p) => p.id === preset.id);
            return (
              <button key={preset.id} type="button" className="btn btn--sm" disabled={exists}
                onClick={() => { setNewProvider({ id: preset.id, name: preset.name, model: preset.model, apiKey: '', enabled: true }); setShowAddForm(true); }}
                style={{ justifyContent: 'flex-start', opacity: exists ? 0.5 : 1 }}>
                {preset.icon} {preset.name}{exists ? ' ✓' : ''}
              </button>
            );
          })}
        </div>
      </SettingsCard>
    </div>
  );
}
