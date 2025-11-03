import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import { BaseProvider } from './base-provider.js';

/**
 * Anthropic Claude provider implementation
 */
export class ClaudeProvider extends BaseProvider {
  constructor(config) {
    super({ ...config, providerName: 'Claude' });

    // Initialize Anthropic SDK for vision API
    const anthropicConfig = { apiKey: this.apiKey };
    if (this.baseUrl) {
      anthropicConfig.baseURL = this.baseUrl;
    }
    this.client = new Anthropic(anthropicConfig);
  }

  /**
   * Stream analysis using native fetch with SSE
   */
  async stream(params, res) {
    const { text, visionAnalysis, system } = params;

    // Format the prompt
    const prompt = this.formatPrompt(text, visionAnalysis, system);

    // Prepare API URL
    const anthropicApiUrl = this.baseUrl
      ? `${this.baseUrl}/v1/messages`
      : 'https://api.anthropic.com/v1/messages';

    // Make streaming request
    const aiResponse = await fetch(anthropicApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 16000,
        temperature: 0.1,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
        system: system || "You are an expert in cyber threat intelligence analysis."
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      throw new Error(`Claude API error: ${error}`);
    }

    if (!aiResponse.body) {
      throw new Error('No response body available from Claude API');
    }

    // Stream response chunks to client
    return new Promise((resolve, reject) => {
      aiResponse.body.on('data', (chunk) => {
        const data = chunk.toString();
        res.write(data);
      });

      aiResponse.body.on('end', () => {
        this.sendSSEComplete(res);
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
   * Analyze images using Claude vision API
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
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4000,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: messageContent,
        }
      ],
    });

    const analysisText = response.content[0]?.type === 'text' ? response.content[0].text : '';

    return {
      analysisText,
      tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
    };
  }

  /**
   * Format prompt for Claude
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
1. Each node MUST have: id (unique), type, data.label, data.description
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
        "label": "Exploit Public-Facing Application",
        "description": "Attacker exploited vulnerable web server",
        "technique_id": "T1190",
        "tactic": "Initial Access",
        "source_excerpt": "Quote from article...",
        "confidence": "high"
      }
    },
    {
      "id": "tool-1",
      "type": "tool",
      "data": {
        "label": "Metasploit",
        "description": "Used for exploitation",
        "source_excerpt": "Quote from article...",
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
   * Build message content with images for Claude
   */
  buildMessageContent(images, prompt) {
    const content = [{ type: 'text', text: prompt }];

    for (const image of images) {
      if (image.base64Data && image.mediaType) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: image.mediaType,
            data: image.base64Data
          }
        });
      }
    }

    return content;
  }

  /**
   * Get supported models
   */
  static getSupportedModels() {
    return [
      'claude-sonnet-4-5-20250929',
      'claude-3-5-sonnet-20241022',
      'claude-opus-4-20250514',
      'claude-3-opus-20240229'
    ];
  }
}
