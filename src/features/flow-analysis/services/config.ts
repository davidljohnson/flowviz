export const API_CONFIG = {
  baseURL: 'https://api.anthropic.com',
  model: 'claude-sonnet-4-20250514',
  maxTokens: 16000, // Model supports higher token limits
  temperature: 0.1, // Restored for deterministic output
} as const;

export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
} as const;

export const PROCESSING_CONFIG = {
  // Model has 200k token input limit (~800k characters)
  // Setting to 700k chars to leave buffer for prompts and system messages
  maxChunkSize: 700000,
  systemPrompt: "You are an expert in cyber threat intelligence and MITRE ATT&CK. Your task is to analyze articles and images to extract detailed attack flow information. You must ONLY respond with a valid JSON object matching the specified structure exactly. Do not include any other text or explanations.",
} as const;
