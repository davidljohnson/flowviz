import fetch from 'node-fetch';
import { buildAnalysisPrompt } from '../prompts/analysisPrompt.js';
import { BaseProvider } from './base-provider.js';

/**
 * Ollama provider implementation
 */
export class OllamaProvider extends BaseProvider {
  constructor(config) {
    super({ ...config, providerName: 'Ollama' });
    
    // Ollama base URL
    this.baseUrl = config.baseUrl;
    // Use separate models for text and vision analysis
    this.textModel = process.env.OLLAMA_TEXT_MODEL;
    this.visionModel = process.env.OLLAMA_VISION_MODEL;
    // Set the model to be used for text analysis (this is what the base provider expects)
    this.model = this.textModel || this.visionModel;
  }
  
  // Overwrite isConfigured() in base-provider.js since Ollama doesn't require an API key for local instances
  isConfigured() {
    // Ollama requires a base URL to be configured
    if (!this.baseUrl) {
      return false;
    }
    
    // Ollama requires at least one model to be configured
    return !!process.env.OLLAMA_TEXT_MODEL || !!process.env.OLLAMA_VISION_MODEL;
  }

  /**
   * Analyze images with vision model
   * @param {Array} images - Array of image objects with base64Data and mediaType
   * @param {string} articleText - Text content from the article
   * @returns {Promise<object>} Analysis result
   */
  async analyzeVision(images, articleText) {
    // Based on tests, vision analysis with ollama model is not accurate, so this is a placeholder
    console.warn('Vision analysis skipped for Ollama provider');
    
    return {
      analysisText: 'Vision analysis is not supported with the current Ollama configuration.',
      confidence: 'low'
    };
  }

  /**
   * Stream response chunks to client
   * @param {Object} params - Analysis parameters
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  async stream(params, res) {
    const { text, visionAnalysis, system } = params;
    const prompt = this.formatPrompt(text, visionAnalysis, system);

    // Prepare the request to Ollama API
    const ollamaApiUrl = `${this.baseUrl}/api/generate`;

    const aiResponse = await fetch(ollamaApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.textModel,
        prompt: prompt,
        system: system || 'You are an expert in cyber threat intelligence analysis.',
        stream: true,
        options: {
          temperature: 0.1,
          num_predict: 8192
        }
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      this.sendError(res, error);
      return;
    }

    // Stream response chunks to client
    // Ollama streams newline-delimited JSON objects. A single data event
    // may contain multiple lines or a partial line, so we buffer by newline.
    return new Promise((resolve, reject) => {
      let buffer = '';

      aiResponse.body.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        // Keep the last (possibly incomplete) line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              this.sendContentDelta(res, parsed.response);
            }
            if (parsed.done) {
              this.sendSSEComplete(res);
              resolve();
            }
          } catch (e) {
            // Skip malformed lines
          }
        }
      });

      aiResponse.body.on('end', () => {
        // Process any remaining buffered data
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer);
            if (parsed.response) {
              this.sendContentDelta(res, parsed.response);
            }
          } catch (e) {
            // Ignore incomplete final chunk
          }
        }
        resolve();
      });

      aiResponse.body.on('error', (error) => {
        this.sendError(res, error.message);
        this.sendSSEComplete(res);
        reject(error);
      });
    });
  }

  /**
   * Stream a multi-turn chat completion (assistant endpoint)
   * @param {Object} params - { system, messages, maxTokens? }
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  async streamChat(params, res) {
    const { system, messages, maxTokens, signal } = params;

    const ollamaApiUrl = `${this.baseUrl}/api/chat`;

    const aiResponse = await fetch(ollamaApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.textModel,
        messages: [{ role: 'system', content: system }, ...messages],
        stream: true,
        options: {
          temperature: 0.2,
          num_predict: maxTokens || 4096
        }
      }),
      signal,
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      this.sendError(res, error);
      this.sendSSEComplete(res);
      return;
    }

    // Same newline-buffered NDJSON loop as stream(), but /api/chat wraps the
    // delta in message.content instead of response
    return new Promise((resolve, reject) => {
      let buffer = '';

      aiResponse.body.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              this.sendContentDelta(res, parsed.message.content);
            }
            if (parsed.done) {
              this.sendSSEComplete(res);
              resolve();
            }
          } catch (e) {
            // Skip malformed lines
          }
        }
      });

      aiResponse.body.on('end', () => {
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer);
            if (parsed.message?.content) {
              this.sendContentDelta(res, parsed.message.content);
            }
          } catch (e) {
            // Ignore incomplete final chunk
          }
        }
        resolve();
      });

      aiResponse.body.on('error', (error) => {
        this.sendError(res, error.message);
        this.sendSSEComplete(res);
        reject(error);
      });
    });
  }

  /**
   * Format prompt for Ollama
   * @param {string} text - Input text
   * @param {string} visionAnalysis - Vision analysis results
   * @param {string} system - System prompt
   * @returns {string} Formatted prompt
   */
  formatPrompt(text, visionAnalysis, system) {
    // Kept for the signature the callers use; the persona travels separately
    // on Claude and is folded into the messages array on OpenAI.
    return buildAnalysisPrompt({ text, visionAnalysis });
  }

  /**
   * Get supported models (static fallback list)
   */
  static getSupportedModels() {
    return [];
  }

  /**
   * Fetch available models from the local Ollama instance
   * @returns {Promise<string[]>} Array of model names
   */
  static async fetchAvailableModels() {
    const baseUrl = process.env.OLLAMA_BASE_URL;
    if (!baseUrl) return [];

    try {
      // A wedged or unreachable Ollama host would otherwise hang this request
      // for the OS TCP timeout, stalling /api/providers behind it
      const response = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.models || []).map(m => m.name);
    } catch (e) {
      return [];
    }
  }
}
