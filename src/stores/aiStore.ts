import { create } from 'zustand';

const STORAGE_KEY = 'Nonaterm:ai-config';

export type AIProvider = {
  id: string;
  name: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  enabled: boolean;
};

export type AIConfig = {
  providers: AIProvider[];
  activeProviderId: string | null;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
};

type AIStore = AIConfig & {
  addProvider: (provider: AIProvider) => void;
  removeProvider: (id: string) => void;
  updateProvider: (id: string, updates: Partial<AIProvider>) => void;
  setActiveProvider: (id: string | null) => void;
  setSystemPrompt: (prompt: string) => void;
  setMaxTokens: (tokens: number) => void;
  setTemperature: (temp: number) => void;
};

function readPersisted(): Partial<AIConfig> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<AIConfig>;
  } catch {
    return {};
  }
}

function writePersisted(patch: Partial<AIConfig>) {
  if (typeof window === 'undefined') return;
  try {
    const current = readPersisted();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...current, ...patch }),
    );
  } catch {
    // localStorage may be disabled
  }
}

const persisted = readPersisted();

export const useAiStore = create<AIStore>((set, get) => ({
  providers: persisted.providers ?? [],
  activeProviderId: persisted.activeProviderId ?? null,
  systemPrompt: persisted.systemPrompt ?? 'You are a helpful coding assistant.',
  maxTokens: persisted.maxTokens ?? 4096,
  temperature: persisted.temperature ?? 0.7,

  addProvider: (provider) => {
    const next = [...get().providers, provider];
    set({ providers: next });
    writePersisted({ providers: next });
  },

  removeProvider: (id) => {
    const next = get().providers.filter((p) => p.id !== id);
    set({ providers: next });
    writePersisted({ providers: next });
    if (get().activeProviderId === id) {
      set({ activeProviderId: null });
      writePersisted({ activeProviderId: null });
    }
  },

  updateProvider: (id, updates) => {
    const next = get().providers.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    set({ providers: next });
    writePersisted({ providers: next });
  },

  setActiveProvider: (id) => {
    set({ activeProviderId: id });
    writePersisted({ activeProviderId: id });
  },

  setSystemPrompt: (prompt) => {
    set({ systemPrompt: prompt });
    writePersisted({ systemPrompt: prompt });
  },

  setMaxTokens: (tokens) => {
    set({ maxTokens: tokens });
    writePersisted({ maxTokens: tokens });
  },

  setTemperature: (temp) => {
    set({ temperature: temp });
    writePersisted({ temperature: temp });
  },
}));
