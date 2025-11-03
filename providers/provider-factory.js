import { ClaudeProvider } from './claude-provider.js';
import { OpenAIProvider } from './openai-provider.js';

/**
 * Factory for creating AI provider instances
 */
export class ProviderFactory {
  /**
   * Create a provider instance
   * @param {string} providerName - 'anthropic', 'claude', 'openai', or 'gpt'
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

      default:
        throw new Error(`Unknown provider: ${providerName}. Supported: anthropic, claude, openai, gpt`);
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
        defaultModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
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

    return providers;
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
    }

    // Otherwise return first available
    const providers = this.getAvailableProviders();
    return providers.length > 0 ? providers[0].id : null;
  }

  /**
   * Get provider configuration from environment
   * @param {string} providerId - Provider ID ('anthropic' or 'openai')
   * @returns {object} Provider configuration
   */
  static getProviderConfig(providerId) {
    const normalized = providerId.toLowerCase().trim();

    if (normalized === 'anthropic' || normalized === 'claude') {
      return {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
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
