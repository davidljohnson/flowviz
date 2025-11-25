import OpenAI from 'openai';
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
    let finalText = text;

    // Prepend vision analysis if available
    if (visionAnalysis) {
      finalText = `## Image Analysis Results\n\n${visionAnalysis}\n\n## Article Text\n\n${text}`;
    }

    // Build the main prompt
    const userPrompt = `You are an expert in cyber threat intelligence and MITRE ATT&CK. Analyze this article and create React Flow nodes and edges directly.

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
        "source_excerpt": "Quote from article...",
        "confidence": "high"
      }
    },
    {
      "id": "tool-1",
      "type": "tool",
      "data": {
        "name": "Metasploit",
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

    const systemPrompt = system || "You are an expert in cyber threat intelligence analysis.";

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
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
   * Get supported models
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
}
