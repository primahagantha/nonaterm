/**
 * Multi-provider AI client.
 * Supports OpenAI, Anthropic, Google, and local models.
 * Compatible with OpenAI SDK API format.
 */

import type { AIProvider } from '@/stores/aiStore';

export type AIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AIResponse = {
  content: string;
  usage: {
    input: number;
    output: number;
  };
};

/**
 * Send a message to an AI provider and get a response.
 */
export async function sendAIMessage(
  provider: AIProvider,
  messages: AIMessage[],
  options: {
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  } = {},
): Promise<AIResponse> {
  const baseUrl = provider.baseUrl || getDefaultBaseUrl(provider.id);
  const endpoint = `${baseUrl}/v1/chat/completions`;

  const body = {
    model: provider.model,
    messages: options.systemPrompt
      ? [{ role: 'system', content: options.systemPrompt }, ...messages]
      : messages,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.7,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(`AI request failed: ${response.status} ${error}`);
  }

  const data = await response.json();

  return {
    content: data.choices?.[0]?.message?.content ?? '',
    usage: {
      input: data.usage?.prompt_tokens ?? 0,
      output: data.usage?.completion_tokens ?? 0,
    },
  };
}

/**
 * Get default base URL for a provider.
 */
function getDefaultBaseUrl(providerId: string): string {
  switch (providerId) {
    case 'openai':
      return 'https://api.openai.com';
    case 'anthropic':
      return 'https://api.anthropic.com';
    case 'google':
      return 'https://generativelanguage.googleapis.com';
    default:
      return 'http://localhost:11434'; // Ollama default
  }
}

/**
 * Get available models for a provider.
 */
export function getAvailableModels(providerId: string): string[] {
  switch (providerId) {
    case 'openai':
      return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    case 'anthropic':
      return ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'];
    case 'google':
      return ['gemini-pro', 'gemini-pro-vision'];
    case 'local':
      return ['llama2', 'codellama', 'mistral', 'custom'];
    default:
      return ['custom'];
  }
}
