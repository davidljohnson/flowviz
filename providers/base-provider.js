/**
 * Base provider interface for AI services
 * All AI providers (Claude, GPT, etc.) must implement these methods
 */
export class BaseProvider {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.baseUrl = config.baseUrl;
    this.providerName = config.providerName || 'unknown';
  }

  /**
   * Stream analysis of article content
   * @param {object} params - { text, visionAnalysis?, system? }
   * @param {object} res - Express response object for SSE streaming
   * @returns {Promise<void>}
   */
  async stream(params, res) {
    throw new Error(`stream() must be implemented by ${this.providerName} provider`);
  }

  /**
   * Analyze image content (vision)
   * @param {string} imageData - Base64 encoded image
   * @param {string} mediaType - Image MIME type
   * @param {string} prompt - Analysis prompt
   * @returns {Promise<string>} Analysis result
   */
  async analyzeVision(imageData, mediaType, prompt) {
    throw new Error(`analyzeVision() must be implemented by ${this.providerName} provider`);
  }

  /**
   * Format prompt for this provider
   * @param {string} text - Article text
   * @param {string} visionAnalysis - Optional vision analysis
   * @param {string} system - System prompt
   * @returns {object} Provider-specific message format
   */
  formatPrompt(text, visionAnalysis, system) {
    throw new Error(`formatPrompt() must be implemented by ${this.providerName} provider`);
  }

  /**
   * Validate configuration
   * @returns {boolean} True if valid
   */
  isConfigured() {
    return !!this.apiKey && !!this.model;
  }

  /**
   * Get provider display name
   * @returns {string}
   */
  getName() {
    return this.providerName;
  }

  /**
   * Send SSE event to client
   * @param {object} res - Express response object
   * @param {object} data - Data to send
   */
  sendSSE(res, data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * Send SSE completion signal
   * @param {object} res - Express response object
   */
  sendSSEComplete(res) {
    res.write('data: [DONE]\n\n');
  }

  /**
   * Send SSE progress event
   * @param {object} res - Express response object
   * @param {string} stage - Progress stage
   * @param {string} message - Progress message
   */
  sendProgress(res, stage, message) {
    this.sendSSE(res, { type: 'progress', stage, message });
  }

  /**
   * Send SSE error event
   * @param {object} res - Express response object
   * @param {string} error - Error message
   */
  sendError(res, error) {
    this.sendSSE(res, { type: 'error', error });
  }

  /**
   * Send SSE content delta event
   * @param {object} res - Express response object
   * @param {string} text - Text delta
   */
  sendContentDelta(res, text) {
    this.sendSSE(res, {
      type: 'content_block_delta',
      delta: { text }
    });
  }
}
