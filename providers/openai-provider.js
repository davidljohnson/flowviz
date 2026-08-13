import OpenAI from 'openai';
import { buildAnalysisPrompt, DEFAULT_ANALYSIS_SYSTEM } from '../prompts/analysisPrompt.js';
import { BaseProvider } from './base-provider.js';

/**
 * OpenAI GPT provider implementation
 */
export class OpenAIProvider extends BaseProvider {
  constructor(config) {
    super({ ...config, providerName: 'OpenAI' });

    // Initialize OpenAI client
    const openaiConfig = { apiKey: this.apiKey };
    if (this.baseUrl) {
      openaiConfig.baseURL = this.baseUrl;
    }
    this.client = new OpenAI(openaiConfig);
  }

  /**
   * Stream analysis using OpenAI streaming API
   */
  async stream(params, res) {
    const { text, visionAnalysis, system } = params;

    // Format messages
    const messages = this.formatPrompt(text, visionAnalysis, system);

    try {
      // Create streaming completion
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.1,
        max_tokens: 16384,
        stream: true,
      });

      // Process stream
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;

        if (delta) {
          // Send content delta in Claude-compatible format
          this.sendContentDelta(res, delta);
        }

        // Check if done
        if (chunk.choices[0]?.finish_reason === 'stop') {
          break;
        }
      }

      // Send completion signal
      this.sendSSEComplete(res);

    } catch (error) {
      this.sendError(res, error.message);
      this.sendSSEComplete(res);
      throw error;
    }
  }

  /**
   * Stream a multi-turn chat completion (assistant endpoint)
   */
  async streamChat(params, res) {
    const { system, messages, maxTokens } = params;

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'system', content: system }, ...messages],
        temperature: 0.2,
        max_tokens: maxTokens || 8192,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;

        if (delta) {
          this.sendContentDelta(res, delta);
        }

        if (chunk.choices[0]?.finish_reason === 'stop') {
          break;
        }
      }

      this.sendSSEComplete(res);

    } catch (error) {
      this.sendError(res, error.message);
      this.sendSSEComplete(res);
      throw error;
    }
  }

  /**
   * Analyze images using OpenAI vision API
   */
  async analyzeVision(images, articleText, prompt) {
    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new Error('Missing or invalid images array');
    }

    // Build vision prompt
    const visionPrompt = prompt || this.buildVisionPrompt(articleText, images.length);

    // Build message content with images
    const messageContent = this.buildMessageContent(images, visionPrompt);

    // Make the API call
    const response = await this.client.chat.completions.create({
      model: this.getVisionModel(),
      messages: [
        {
          role: 'user',
          content: messageContent
        }
      ],
      max_tokens: 4000,
      temperature: 0.1
    });

    const analysisText = response.choices[0]?.message?.content || '';

    return {
      analysisText,
      tokensUsed: (response.usage?.prompt_tokens || 0) + (response.usage?.completion_tokens || 0)
    };
  }

  /**
   * Format prompt for OpenAI
   */
  formatPrompt(text, visionAnalysis, system) {
    return [
      { role: 'system', content: system || DEFAULT_ANALYSIS_SYSTEM },
      { role: 'user', content: buildAnalysisPrompt({ text, visionAnalysis }) },
    ];
  }

  /**
   * Build vision analysis prompt
   */
  buildVisionPrompt(articleText, imageCount) {
    return `You are analyzing ${imageCount} images from a cybersecurity article to enhance threat intelligence analysis.

Article context (first 1000 chars):
${articleText.substring(0, 1000)}...

Please analyze the images and provide:
1. Technical details visible in screenshots (commands, file paths, network indicators)
2. Attack techniques or tools shown
3. Any MITRE ATT&CK relevant information
4. System configurations or vulnerabilities displayed

Focus on actionable technical intelligence that supplements the article text.`;
  }

  /**
   * Build message content with images for OpenAI
   */
  buildMessageContent(images, prompt) {
    const content = [{ type: 'text', text: prompt }];

    for (const image of images) {
      if (image.base64Data && image.mediaType) {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${image.mediaType};base64,${image.base64Data}`
          }
        });
      }
    }

    return content;
  }

  /**
   * Get the vision-capable model
   */
  getVisionModel() {
    // Use gpt-4o for vision if main model doesn't support vision
    const visionModels = ['gpt-4o', 'gpt-4o-2024-11-20', 'gpt-4-turbo', 'gpt-4-turbo-2024-04-09'];
    return visionModels.includes(this.model) ? this.model : 'gpt-4o';
  }

  /**
   * Get supported models (static fallback list)
   *
   * Only consulted when the live /v1/models lookup below fails - offline, bad
   * key, or a proxy that does not expose the endpoint.
   */
  static getSupportedModels() {
    return [
      // GPT-4o series (multimodal flagship)
      'gpt-4o',
      'gpt-4o-2024-11-20',
      'gpt-4o-mini',

      // o1 reasoning models
      'o1',
      'o1-preview',
      'o1-mini',

      // GPT-4 series
      'gpt-4-turbo',
      'gpt-4-turbo-2024-04-09',
      'gpt-4',
      'gpt-4-0125-preview'
    ];
  }

  /**
   * Is this model ID a chat-completions model?
   *
   * Unlike Anthropic's, OpenAI's /v1/models returns the whole catalogue -
   * embeddings, speech, image and moderation models included - so the list has
   * to be narrowed before it reaches the model dropdown.
   * @param {string} id - Model ID from the API
   * @returns {boolean}
   */
  static isChatModel(id) {
    if (!/^(gpt-|o[1-9]|chatgpt-)/.test(id)) return false;
    return !/(embedding|whisper|tts|audio|realtime|transcribe|moderation|image|instruct|dall-e)/.test(id);
  }

  /**
   * Fetch available models from the OpenAI API
   * @returns {Promise<string[]>} Chat model IDs, or [] if the lookup failed
   */
  static async fetchAvailableModels() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return [];

    try {
      const config = { apiKey };
      if (process.env.OPENAI_BASE_URL) {
        config.baseURL = process.env.OPENAI_BASE_URL;
      }
      const client = new OpenAI(config);

      const models = [];
      for await (const model of client.models.list()) {
        if (OpenAIProvider.isChatModel(model.id)) models.push(model.id);
      }
      // OpenAI returns creation order; alphabetical groups the families together
      return models.sort();
    } catch (e) {
      return [];
    }
  }
}
