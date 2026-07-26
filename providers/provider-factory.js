import { ClaudeProvider } from './claude-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { OllamaProvider } from './ollama-provider.js';

// Model catalogues change monthly at most, and /api/providers would otherwise
// fan out to three upstream APIs on every request.
const MODEL_CACHE_TTL_MS = 60 * 60 * 1000;
// Failures are cached far more briefly, so a provider that comes back online is
// picked up quickly - but a persistently unreachable one isn't retried on every
// single request.
const MODEL_CACHE_FAILURE_TTL_MS = 60 * 1000;
// No single provider gets to hold up the whole response
const MODEL_FETCH_TIMEOUT_MS = 5000;
const modelCache = new Map();

/**
 * Factory for creating AI provider instances
 */
export class ProviderFactory {
  /**
   * Create a provider instance
   * @param {string} providerName - 'anthropic', 'claude', 'openai', 'gpt', or 'ollama'
   * @param {object} config - Provider configuration { apiKey, model, baseUrl }
   * @returns {BaseProvider}
   */
  static create(providerName, config) {
    const normalized = providerName.toLowerCase().trim();

    switch (normalized) {
      case 'anthropic':
      case 'claude':
        return new ClaudeProvider(config);

      case 'openai':
      case 'gpt':
        return new OpenAIProvider(config);

      case 'ollama':
        return new OllamaProvider(config);

      default:
        throw new Error(`Unknown provider: ${providerName}. Supported: anthropic, claude, openai, gpt, ollama`);
    }
  }

  /**
   * Get list of available providers based on environment configuration
   * @returns {Array<object>} Available providers with their models
   */
  static getAvailableProviders() {
    const providers = [];

    // Check for Anthropic/Claude
    if (process.env.ANTHROPIC_API_KEY) {
      providers.push({
        id: 'anthropic',
        name: 'Anthropic',
        displayName: 'Anthropic',
        models: ClaudeProvider.getSupportedModels(),
        defaultModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        configured: true
      });
    }

    // Check for OpenAI/GPT
    if (process.env.OPENAI_API_KEY) {
      providers.push({
        id: 'openai',
        name: 'OpenAI',
        displayName: 'OpenAI',
        models: OpenAIProvider.getSupportedModels(),
        defaultModel: process.env.OPENAI_MODEL || 'gpt-4o',
        configured: true
      });
    }

    // Check for Ollama
    if (process.env.OLLAMA_BASE_URL && (process.env.OLLAMA_TEXT_MODEL || process.env.OLLAMA_VISION_MODEL)) {
      providers.push({
        id: 'ollama',
        name: 'Ollama',
        displayName: 'Ollama',
        models: OllamaProvider.getSupportedModels(),
        defaultModel: process.env.OLLAMA_TEXT_MODEL || 'huggingface.co/TeichAI/Qwen3-14B-Claude-Sonnet-4.5-Reasoning-Distill-GGUF:latest',
        configured: true
      });
    }

    return providers;
  }

  /**
   * Fetch the live model list for one provider, with a TTL cache
   *
   * Successes are cached for an hour; failures for a minute, so a slow or
   * unreachable provider can't make every /api/providers request pay the
   * timeout while still recovering quickly once it's back.
   * @param {string} providerId - 'anthropic', 'openai', or 'ollama'
   * @returns {Promise<string[]>} Model IDs, or [] if the lookup failed
   */
  static async fetchModelsFor(providerId) {
    const cached = modelCache.get(providerId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.models;
    }

    let fetchModels;
    switch (providerId) {
      case 'anthropic':
        fetchModels = () => ClaudeProvider.fetchAvailableModels();
        break;
      case 'openai':
        fetchModels = () => OpenAIProvider.fetchAvailableModels();
        break;
      case 'ollama':
        fetchModels = () => OllamaProvider.fetchAvailableModels();
        break;
      default:
        return [];
    }

    let models = [];
    try {
      // Belt and braces: the providers apply their own timeouts, but a hung
      // SDK call must not be able to stall the endpoint either
      models = await Promise.race([
        fetchModels(),
        new Promise((resolve) => setTimeout(() => resolve([]), MODEL_FETCH_TIMEOUT_MS))
      ]);
    } catch (e) {
      models = [];
    }

    const ttl = models.length > 0 ? MODEL_CACHE_TTL_MS : MODEL_CACHE_FAILURE_TTL_MS;
    modelCache.set(providerId, { models, expiresAt: Date.now() + ttl });
    return models;
  }

  /**
   * Get available providers with their model lists fetched live from each
   * provider's API, falling back to the static lists when a lookup fails.
   *
   * This is what keeps the model dropdown current without anyone editing a
   * hardcoded array - use it for anything user-facing. getAvailableProviders()
   * stays synchronous for callers that only need to know which providers exist.
   * @returns {Promise<Array<object>>} Available providers
   */
  static async getAvailableProvidersLive() {
    const providers = this.getAvailableProviders();

    await Promise.all(providers.map(async (provider) => {
      const models = await this.fetchModelsFor(provider.id);
      if (models.length > 0) {
        provider.models = models;
        provider.modelsSource = 'live';
      } else {
        provider.modelsSource = 'fallback';
      }

      // The configured model is what the backend will actually call, so it
      // belongs in the dropdown even when the catalogue doesn't list it
      // (a fine-tune, a proxy alias, or a stale ANTHROPIC_MODEL).
      if (provider.defaultModel && !provider.models.includes(provider.defaultModel)) {
        provider.models = [provider.defaultModel, ...provider.models];
      }
    }));

    return providers;
  }

  /**
   * Clear the cached model lists (exposed for tests and manual refresh)
   */
  static clearModelCache() {
    modelCache.clear();
  }

  /**
   * Get default provider based on environment configuration
   * @returns {string|null} Default provider ID or null
   */
  static getDefaultProvider() {
    // Check for explicit default
    if (process.env.DEFAULT_AI_PROVIDER) {
      const normalized = process.env.DEFAULT_AI_PROVIDER.toLowerCase().trim();
      if (normalized === 'openai' || normalized === 'gpt') {
        return 'openai';
      }
      if (normalized === 'anthropic' || normalized === 'claude') {
        return 'anthropic';
      }
      if (normalized === 'ollama') {
        // Verify that Ollama is actually configured before returning it as default
        const providers = this.getAvailableProviders();
        const ollamaProvider = providers.find(p => p.id === 'ollama');
        if (ollamaProvider && ollamaProvider.configured) {
          return 'ollama';
        }
        // If Ollama is not properly configured, fall through to return first available provider
      }
    }

    // Otherwise return first available
    const providers = this.getAvailableProviders();
    return providers.length > 0 ? providers[0].id : null;
  }

  /**
   * Get provider configuration from environment
   * @param {string} providerId - Provider ID ('anthropic', 'openai', or 'ollama')
   * @returns {object} Provider configuration
   */
  static getProviderConfig(providerId) {
    const normalized = providerId.toLowerCase().trim();

    if (normalized === 'anthropic' || normalized === 'claude') {
      return {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        baseUrl: process.env.ANTHROPIC_BASE_URL
      };
    }

    if (normalized === 'openai' || normalized === 'gpt') {
      return {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        baseUrl: process.env.OPENAI_BASE_URL
      };
    }

    if (normalized === 'ollama') {
      return {
        textModel: process.env.OLLAMA_TEXT_MODEL,
        visionModel: process.env.OLLAMA_VISION_MODEL,
        baseUrl: process.env.OLLAMA_BASE_URL
      };
    }

    throw new Error(`Unknown provider: ${providerId}`);
  }

  /**
   * Validate that at least one provider is configured
   * @returns {boolean}
   */
  static hasConfiguredProviders() {
    return this.getAvailableProviders().length > 0;
  }

  /**
   * Get provider info by ID
   * @param {string} providerId - Provider ID
   * @returns {object|null} Provider info or null
   */
  static getProviderInfo(providerId) {
    const providers = this.getAvailableProviders();
    return providers.find(p => p.id === providerId) || null;
  }
}
