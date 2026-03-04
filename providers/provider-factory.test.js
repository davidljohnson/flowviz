import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProviderFactory } from './provider-factory.js';
import { ClaudeProvider } from './claude-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { OllamaProvider } from './ollama-provider.js';

describe('ProviderFactory', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ── create() ──────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates ClaudeProvider for "anthropic"', () => {
      const provider = ProviderFactory.create('anthropic', { apiKey: 'key', model: 'm' });
      expect(provider).toBeInstanceOf(ClaudeProvider);
    });

    it('creates ClaudeProvider for "claude"', () => {
      const provider = ProviderFactory.create('claude', { apiKey: 'key', model: 'm' });
      expect(provider).toBeInstanceOf(ClaudeProvider);
    });

    it('creates OpenAIProvider for "openai"', () => {
      const provider = ProviderFactory.create('openai', { apiKey: 'key', model: 'm' });
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('creates OpenAIProvider for "gpt"', () => {
      const provider = ProviderFactory.create('gpt', { apiKey: 'key', model: 'm' });
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('creates OllamaProvider for "ollama"', () => {
      const provider = ProviderFactory.create('ollama', { baseUrl: 'http://localhost:11434' });
      expect(provider).toBeInstanceOf(OllamaProvider);
    });

    it('normalizes case and whitespace', () => {
      const provider = ProviderFactory.create('  ANTHROPIC  ', { apiKey: 'key', model: 'm' });
      expect(provider).toBeInstanceOf(ClaudeProvider);
    });

    it('throws for unknown provider', () => {
      expect(() => ProviderFactory.create('gemini', {}))
        .toThrow('Unknown provider: gemini');
    });
  });

  // ── getAvailableProviders() ───────────────────────────────────────────

  describe('getAvailableProviders()', () => {
    beforeEach(() => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.OLLAMA_BASE_URL;
      delete process.env.OLLAMA_TEXT_MODEL;
      delete process.env.OLLAMA_VISION_MODEL;
    });

    it('returns empty array when nothing is configured', () => {
      expect(ProviderFactory.getAvailableProviders()).toEqual([]);
    });

    it('includes Anthropic when ANTHROPIC_API_KEY is set', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      const providers = ProviderFactory.getAvailableProviders();
      expect(providers).toHaveLength(1);
      expect(providers[0].id).toBe('anthropic');
      expect(providers[0].configured).toBe(true);
    });

    it('includes OpenAI when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const providers = ProviderFactory.getAvailableProviders();
      expect(providers).toHaveLength(1);
      expect(providers[0].id).toBe('openai');
    });

    it('includes Ollama when base URL and text model are set', () => {
      process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
      process.env.OLLAMA_TEXT_MODEL = 'mistral:7b';
      const providers = ProviderFactory.getAvailableProviders();
      expect(providers).toHaveLength(1);
      expect(providers[0].id).toBe('ollama');
    });

    it('does not include Ollama when only base URL is set (no model)', () => {
      process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
      const providers = ProviderFactory.getAvailableProviders();
      expect(providers).toHaveLength(0);
    });

    it('returns all three when all are configured', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant';
      process.env.OPENAI_API_KEY = 'sk-oai';
      process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
      process.env.OLLAMA_TEXT_MODEL = 'mistral:7b';
      const providers = ProviderFactory.getAvailableProviders();
      expect(providers).toHaveLength(3);
      expect(providers.map(p => p.id)).toEqual(['anthropic', 'openai', 'ollama']);
    });

    it('uses custom ANTHROPIC_MODEL when set', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      process.env.ANTHROPIC_MODEL = 'claude-opus-4-20250514';
      const providers = ProviderFactory.getAvailableProviders();
      expect(providers[0].defaultModel).toBe('claude-opus-4-20250514');
    });

    it('uses default model when ANTHROPIC_MODEL is not set', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      delete process.env.ANTHROPIC_MODEL;
      const providers = ProviderFactory.getAvailableProviders();
      expect(providers[0].defaultModel).toBe('claude-sonnet-4-5-20250929');
    });
  });

  // ── getDefaultProvider() ──────────────────────────────────────────────

  describe('getDefaultProvider()', () => {
    beforeEach(() => {
      delete process.env.DEFAULT_AI_PROVIDER;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.OLLAMA_BASE_URL;
      delete process.env.OLLAMA_TEXT_MODEL;
      delete process.env.OLLAMA_VISION_MODEL;
    });

    it('returns null when no providers are configured', () => {
      expect(ProviderFactory.getDefaultProvider()).toBeNull();
    });

    it('returns first available when no explicit default', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      expect(ProviderFactory.getDefaultProvider()).toBe('anthropic');
    });

    it('respects explicit DEFAULT_AI_PROVIDER=openai', () => {
      process.env.DEFAULT_AI_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'sk-test';
      expect(ProviderFactory.getDefaultProvider()).toBe('openai');
    });

    it('respects DEFAULT_AI_PROVIDER=claude (alias)', () => {
      process.env.DEFAULT_AI_PROVIDER = 'claude';
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      expect(ProviderFactory.getDefaultProvider()).toBe('anthropic');
    });

    it('respects DEFAULT_AI_PROVIDER=ollama when configured', () => {
      process.env.DEFAULT_AI_PROVIDER = 'ollama';
      process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
      process.env.OLLAMA_TEXT_MODEL = 'mistral:7b';
      expect(ProviderFactory.getDefaultProvider()).toBe('ollama');
    });

    it('falls back to first available when Ollama is default but not configured', () => {
      process.env.DEFAULT_AI_PROVIDER = 'ollama';
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      // No OLLAMA_BASE_URL — Ollama is not configured
      expect(ProviderFactory.getDefaultProvider()).toBe('anthropic');
    });

    it('falls back to first available when Ollama default has no model', () => {
      process.env.DEFAULT_AI_PROVIDER = 'ollama';
      process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
      // No OLLAMA_TEXT_MODEL or OLLAMA_VISION_MODEL
      process.env.OPENAI_API_KEY = 'sk-test';
      expect(ProviderFactory.getDefaultProvider()).toBe('openai');
    });
  });

  // ── getProviderConfig() ───────────────────────────────────────────────

  describe('getProviderConfig()', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant';
      process.env.OPENAI_API_KEY = 'sk-oai';
      process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
      process.env.OLLAMA_TEXT_MODEL = 'mistral:7b';
      process.env.OLLAMA_VISION_MODEL = 'qwen3-vl';
    });

    it('returns Anthropic config with correct shape', () => {
      const config = ProviderFactory.getProviderConfig('anthropic');
      expect(config).toHaveProperty('apiKey', 'sk-ant');
      expect(config).toHaveProperty('model');
      expect(config).toHaveProperty('baseUrl');
    });

    it('returns OpenAI config with correct shape', () => {
      const config = ProviderFactory.getProviderConfig('openai');
      expect(config).toHaveProperty('apiKey', 'sk-oai');
      expect(config).toHaveProperty('model');
      expect(config).toHaveProperty('baseUrl');
    });

    it('returns Ollama config with correct shape', () => {
      const config = ProviderFactory.getProviderConfig('ollama');
      expect(config).toHaveProperty('textModel', 'mistral:7b');
      expect(config).toHaveProperty('visionModel', 'qwen3-vl');
      expect(config).toHaveProperty('baseUrl', 'http://127.0.0.1:11434');
    });

    it('accepts alias "claude" for anthropic', () => {
      const config = ProviderFactory.getProviderConfig('claude');
      expect(config.apiKey).toBe('sk-ant');
    });

    it('accepts alias "gpt" for openai', () => {
      const config = ProviderFactory.getProviderConfig('gpt');
      expect(config.apiKey).toBe('sk-oai');
    });

    it('throws for unknown provider', () => {
      expect(() => ProviderFactory.getProviderConfig('gemini'))
        .toThrow('Unknown provider: gemini');
    });
  });

  // ── hasConfiguredProviders() ──────────────────────────────────────────

  describe('hasConfiguredProviders()', () => {
    beforeEach(() => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.OLLAMA_BASE_URL;
      delete process.env.OLLAMA_TEXT_MODEL;
      delete process.env.OLLAMA_VISION_MODEL;
    });

    it('returns false when nothing configured', () => {
      expect(ProviderFactory.hasConfiguredProviders()).toBe(false);
    });

    it('returns true when at least one provider configured', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      expect(ProviderFactory.hasConfiguredProviders()).toBe(true);
    });
  });

  // ── getProviderInfo() ─────────────────────────────────────────────────

  describe('getProviderInfo()', () => {
    it('returns provider info when found', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      const info = ProviderFactory.getProviderInfo('anthropic');
      expect(info).not.toBeNull();
      expect(info.id).toBe('anthropic');
    });

    it('returns null when provider not configured', () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.OLLAMA_BASE_URL;
      expect(ProviderFactory.getProviderInfo('anthropic')).toBeNull();
    });
  });
});
