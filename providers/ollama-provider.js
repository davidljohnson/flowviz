import fetch from 'node-fetch';
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
   * Format prompt for Ollama
   * @param {string} text - Input text
   * @param {string} visionAnalysis - Vision analysis results
   * @param {string} system - System prompt
   * @returns {string} Formatted prompt
   */
  formatPrompt(text, visionAnalysis, system) {
    let finalText = text;

    // Prepend vision analysis if available
    if (visionAnalysis) {
      finalText = `## Image Analysis Results\n\n${visionAnalysis}\n\n## Article Text\n\n${text}`;
    }

    // Build the main prompt
    const prompt = `You are an expert in cyber threat intelligence and MITRE ATT&CK. Analyze this article and create React Flow nodes and edges directly.

IMPORTANT: Return only a valid JSON object with "nodes" and "edges" arrays. No text before or after.

Node types you can use:
- action: MITRE ATT&CK techniques (must include technique_id like T1190)
- tool: Legitimate software used in attack
- malware: Malicious software
- asset: Target systems/resources
- infrastructure: C2 servers, domains, IPs
- url: Web resources referenced
- vulnerability: CVEs or specific vulnerabilities
- AND_operator: Logical AND gate (attack requires multiple conditions)
- OR_operator: Logical OR gate (attack can follow multiple paths)

Edge types (relationship labels):
- "Uses", "Targets", "Communicates with", "Connects to", "Affects", "Leads to"

Requirements:
1. Each node MUST have: id (unique), type, data.name, data.description
2. Action nodes MUST have: data.technique_id (e.g., "T1190"), data.tactic (e.g., "Initial Access")
3. All nodes should include: data.source_excerpt (relevant quote from article), data.confidence ("low", "medium", "high")
4. Use chronological ordering when possible
5. Create edges that show attack progression
6. Include operator nodes (AND/OR) for complex logic
7. Extract specific technical indicators (IPs, domains, file hashes, commands)

Example output format:
{
  "nodes": [
    {
      "id": "action-1",
      "type": "action",
      "data": {
        "name": "Exploit Public-Facing Application",
        "description": "Attacker exploited vulnerable web server",
        "technique_id": "T1190",
        "tactic": "Initial Access",
        "source_excerpt": "Quote from article. ..",
        "confidence": "high"
      }
    },
    {
      "id": "tool-1",
      "type": "tool",
      "data": {
        "name": "Metasploit",
        "description": "Used for exploitation",
        "source_excerpt": "Quote from article. ..",
        "confidence": "medium"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "action-1",
      "target": "tool-1",
      "type": "floating",
      "label": "Uses"
    }
  ]
}

Article: "${finalText.substring(0, 50000)}"

Article text:
`;

    return prompt;
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
      const response = await fetch(`${baseUrl}/api/tags`);
      if (!response.ok) return [];
      const data = await response.json();
      return (data.models || []).map(m => m.name);
    } catch (e) {
      return [];
    }
  }
}
