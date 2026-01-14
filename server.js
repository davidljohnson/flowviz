import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { fileTypeFromBuffer } from 'file-type';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { validateUrl, secureFetch, rateLimits, handleFetchError } from './security-utils.js';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from './src/shared/utils/logger.js';
import dotenv from 'dotenv';
import { ProviderFactory } from './providers/provider-factory.js';

// Load environment variables from .env file
const dotenvResult = dotenv.config();

// Force values from .env file if available
if (dotenvResult.parsed) {
  // Make sure .env variables take precedence over shell environment
  if (dotenvResult.parsed.ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = dotenvResult.parsed.ANTHROPIC_API_KEY;
  }

  if (dotenvResult.parsed.ANTHROPIC_BASE_URL) {
    process.env.ANTHROPIC_BASE_URL = dotenvResult.parsed.ANTHROPIC_BASE_URL;
  }

  if (dotenvResult.parsed.ANTHROPIC_MODEL) {
    process.env.ANTHROPIC_MODEL = dotenvResult.parsed.ANTHROPIC_MODEL;
  }

  if (dotenvResult.parsed.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = dotenvResult.parsed.OPENAI_API_KEY;
  }

  if (dotenvResult.parsed.OPENAI_BASE_URL) {
    process.env.OPENAI_BASE_URL = dotenvResult.parsed.OPENAI_BASE_URL;
  }

  if (dotenvResult.parsed.OPENAI_MODEL) {
    process.env.OPENAI_MODEL = dotenvResult.parsed.OPENAI_MODEL;
  }

  if (dotenvResult.parsed.OLLAMA_BASE_URL) {
    process.env.OLLAMA_BASE_URL = dotenvResult.parsed.OLLAMA_BASE_URL;
  }

  if (dotenvResult.parsed.OLLAMA_TEXT_MODEL) {
    process.env.OLLAMA_TEXT_MODEL = dotenvResult.parsed.OLLAMA_TEXT_MODEL;
  }

  if (dotenvResult.parsed.OLLAMA_VISION_MODEL) {
    process.env.OLLAMA_VISION_MODEL = dotenvResult.parsed.OLLAMA_VISION_MODEL;
  }

  if (dotenvResult.parsed.DEFAULT_AI_PROVIDER) {
    process.env.DEFAULT_AI_PROVIDER = dotenvResult.parsed.DEFAULT_AI_PROVIDER;
  }
}

// Log the loaded environment variables to verify .env file loading
console.log('[ENV] Loaded from .env file:', dotenvResult.parsed ? 'YES' : 'NO');
console.log('[ENV] ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '***' + process.env.ANTHROPIC_API_KEY.slice(-4) : 'Not set');
console.log('[ENV] ANTHROPIC_BASE_URL:', process.env.ANTHROPIC_BASE_URL || 'Not set');
console.log('[ENV] ANTHROPIC_MODEL:', process.env.ANTHROPIC_MODEL || 'Not set');
console.log('[ENV] OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '***' + process.env.OPENAI_API_KEY.slice(-4) : 'Not set');
console.log('[ENV] OPENAI_BASE_URL:', process.env.OPENAI_BASE_URL || 'Not set');
console.log('[ENV] OPENAI_MODEL:', process.env.OPENAI_MODEL || 'Not set');
console.log('[ENV] OLLAMA_BASE_URL:', process.env.OLLAMA_BASE_URL || 'Not set');
console.log('[ENV] OLLAMA_TEXT_MODEL:', process.env.OLLAMA_TEXT_MODEL || 'Not set');
console.log('[ENV] OLLAMA_VISION_MODEL:', process.env.OLLAMA_VISION_MODEL || 'Not set');
console.log('[ENV] DEFAULT_AI_PROVIDER:', process.env.DEFAULT_AI_PROVIDER || 'Not set');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware - MUST come first
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.anthropic.com"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for some React dev tools
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Enable CORS for specific origins only
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Use environment variable for allowed origins, or default to localhost
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : [
          'http://localhost:5173',
          'http://localhost:3000',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:3000'
        ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Parse JSON bodies with size limits (configurable via environment)
const maxRequestSize = process.env.MAX_REQUEST_SIZE || '10mb';
app.use(express.json({ limit: maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: maxRequestSize }));

// Serve static files from dist folder in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get available AI providers
app.get('/api/providers', (_req, res) => {
  try {
    const providers = ProviderFactory.getAvailableProviders();
    const defaultProvider = ProviderFactory.getDefaultProvider();

    logger.info('Providers request', {
      availableCount: providers.length,
      defaultProvider
    });

    res.json({
      providers,
      defaultProvider,
      hasConfiguredProviders: providers.length > 0
    });
  } catch (error) {
    logger.error('Error getting providers:', error);
    res.status(500).json({
      error: 'Failed to get available providers',
      details: error.message
    });
  }
});

// Secure image fetch endpoint with rate limiting and validation  
app.get('/api/fetch-image', rateLimits.images, async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  logger.debug(`Fetching image from: ${url}`);
  
  try {
    // Step 1: Validate URL to prevent SSRF attacks
    const validatedUrl = validateUrl(url);
    
    // Step 2: Secure fetch with image-specific settings
    const response = await secureFetch(validatedUrl, {
      timeout: 15000, // 15 seconds for images
      maxSize: parseInt(process.env.MAX_IMAGE_SIZE) || 5 * 1024 * 1024, // Default 5MB limit for images
      headers: {
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      }
    });
    
    logger.debug(`Image response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      logger.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: `Failed to fetch image: ${response.statusText}` 
      });
    }
    
    // Step 3: Validate content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return res.status(400).json({ 
        error: 'Invalid content type. Only image content is supported.' 
      });
    }
    
    // Step 4: Get image data with size validation
    const buffer = await response.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);
    
    if (nodeBuffer.length > (parseInt(process.env.MAX_IMAGE_SIZE) || 3 * 1024 * 1024)) { // Configurable limit for processed images
      return res.status(413).json({ 
        error: 'Image too large. Maximum size is 3MB.' 
      });
    }
    
    // Step 5: Detect and validate file type
    const fileType = await fileTypeFromBuffer(nodeBuffer);
    const mediaType = fileType?.mime || contentType || 'image/jpeg';
    
    // Only allow common image formats
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(mediaType)) {
      return res.status(400).json({ 
        error: `Unsupported image format: ${mediaType}. Allowed: ${allowedTypes.join(', ')}` 
      });
    }
    
    // Step 6: Convert to base64
    const base64 = nodeBuffer.toString('base64');
    
    logger.info(`Image fetched: ${mediaType}, ${Math.round(base64.length/1024)}KB`);
    res.json({ base64, mediaType });
    
  } catch (error) {
    const errorResponse = handleFetchError(error, 'image');
    res.status(errorResponse.status).json({
      error: errorResponse.error,
      details: errorResponse.details
    });
  }
});

// Secure article fetch endpoint with rate limiting and proper parsing
app.get('/api/fetch-article', rateLimits.articles, async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  logger.debug(`Fetching article from: ${url}`);
  
  try {
    // Step 1: Validate URL to prevent SSRF attacks
    const validatedUrl = validateUrl(url);
    
    // Step 2: Secure fetch with article-specific settings
    const response = await secureFetch(validatedUrl, {
      timeout: 30000, // 30 seconds for articles
      maxSize: 10 * 1024 * 1024, // 10MB limit
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    
    logger.debug(`Article response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      logger.error(`Failed to fetch article: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: `Failed to fetch article: ${response.statusText}` 
      });
    }
    
    // Step 3: Validate content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      return res.status(400).json({ 
        error: 'Invalid content type. Only HTML content is supported.' 
      });
    }
    
    // Step 4: Get HTML with size check
    const html = await response.text();
    if (html.length > (parseInt(process.env.MAX_ARTICLE_SIZE) || 5 * 1024 * 1024)) { // Configurable limit
      return res.status(413).json({ 
        error: 'Content too large. Maximum size is 5MB.' 
      });
    }
    
    // Step 5: Parse with Mozilla Readability for better content extraction
    const dom = new JSDOM(html, { url: validatedUrl.href });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    
    if (!article) {
      // Fallback to original HTML if Readability fails
      logger.warn('Readability parsing failed, falling back to raw HTML');
      res.json({ contents: html });
      return;
    }
    
    // Return enhanced content with better structure
    const enhancedHtml = `
      <html>
        <head><title>${article.title || 'Article'}</title></head>
        <body>
          <h1>${article.title || 'Article'}</h1>
          ${article.byline ? `<p class="byline">${article.byline}</p>` : ''}
          <div class="content">${article.content}</div>
        </body>
      </html>
    `;
    
    logger.info(`Successfully parsed article: "${article.title}", content length: ${enhancedHtml.length} characters`);
    res.json({ 
      contents: enhancedHtml,
      metadata: {
        title: article.title,
        byline: article.byline,
        excerpt: article.excerpt,
        length: article.length,
        readTime: Math.ceil(article.length / 200) // rough reading time in minutes
      }
    });
    
  } catch (error) {
    const errorResponse = handleFetchError(error, 'article');
    res.status(errorResponse.status).json({
      error: errorResponse.error,
      details: errorResponse.details
    });
  }
});

// Vision analysis endpoint for secure server-side processing
app.post('/api/vision-analysis', rateLimits.streaming, async (req, res) => {
  try {
    const { images, articleText } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid images array' });
    }
    
    if (!articleText || typeof articleText !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid articleText' });
    }
    
    logger.info(`Vision analysis request: ${images.length} images, ${articleText.length} chars of text`);
    
    // Initialize Anthropic client with server API key and base URL
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const baseURL = process.env.ANTHROPIC_BASE_URL;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error: Anthropic API key not configured' });
    }
    
    const anthropicConfig = { apiKey };
    if (baseURL) {
      anthropicConfig.baseURL = baseURL;
    }
    
    const anthropic = new Anthropic(anthropicConfig);
    
    // Build the vision analysis prompt
    const prompt = buildVisionPrompt(articleText, images.length);
    
    // Build message content with images
    const messageContent = buildMessageContent(images, prompt);
    
    // Make the API call
    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
    const response = await anthropic.messages.create({
      model: model,
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
    const confidence = assessConfidence(analysisText, images.length);
    
    logger.info(`Vision analysis completed: ${analysisText.length} chars, ${confidence} confidence`);
    
    res.json({
      analysisText,
      confidence,
      relevantImages: images,
      tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens || 0
    });
    
  } catch (error) {
    logger.error('Vision analysis error:', error);
    res.status(500).json({ 
      error: 'Vision analysis failed', 
      details: error.message 
    });
  }
});

// Vision analysis utilities
function buildVisionPrompt(articleText, imageCount) {
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

function buildMessageContent(images, prompt) {
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

function assessConfidence(analysisText, imageCount) {
  if (!analysisText || analysisText.length < 100) return 'low';
  
  const technicalIndicators = [
    /T\d{4}/, // MITRE technique IDs
    /CVE-\d{4}-\d+/, // CVE references
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // IP addresses
    /[a-f0-9]{32,}/ // Hashes
  ];
  
  const matches = technicalIndicators.reduce((count, pattern) => 
    count + (analysisText.match(pattern) || []).length, 0);
    
  if (matches >= 3 && imageCount >= 2) return 'high';
  if (matches >= 1 || imageCount >= 1) return 'medium';
  return 'low';
}

// Unified AI streaming endpoint with provider selection - PROTECTED with strict rate limiting
app.post('/api/analyze-stream', rateLimits.streaming, async (req, res) => {
  logger.info('Starting unified AI streaming request...');

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  try {
    const { provider, model, url, text, system } = req.body;
    logger.debug('Request body received', { provider, model, hasUrl: !!url, hasText: !!text });

    // Determine which provider to use
    // const selectedProvider = provider || ProviderFactory.getDefaultProvider();
    const selectedProvider = ProviderFactory.getDefaultProvider();

    // console.log('[DEBUG] server.js - selectedProvider:', selectedProvider) ;

    if (!selectedProvider) {
      logger.error('No AI providers configured');
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'No AI providers configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY.' })}\n\n`);
      res.end();
      return;
    }

    logger.info('Using AI provider:', selectedProvider);

    // Get provider configuration
    const providerConfig = ProviderFactory.getProviderConfig(selectedProvider);

    // Override model if specified in request
    if (model) {
      providerConfig.model = model;
    }

    // Create provider instance
    const aiProvider = ProviderFactory.create(selectedProvider, providerConfig);

    // Validate provider is configured
    if (!aiProvider.isConfigured()) {
      logger.error(`${selectedProvider} provider not properly configured`);
      res.write(`data: ${JSON.stringify({ type: 'error', error: `${selectedProvider} provider not configured. Missing API key.` })}\n\n`);
      res.end();
      return;
    }

    // Validate input
    if (!url && !text) {
      logger.warn('Request missing both URL and text');
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Either URL or text is required' })}\n\n`);
      res.end();
      return;
    }

    let finalText;
    let visionAnalysis = null;

    // Process URL if provided
    if (url) {
      res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'fetching_article', message: 'Fetching article content...' })}\n\n`);

      const validatedUrl = validateUrl(url);
      const response = await secureFetch(validatedUrl, { timeout: 30000 });

      if (!response.ok) {
        throw new Error(`Failed to fetch article: ${response.statusText}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html, { url: validatedUrl.href });
      const readabilityReader = new Readability(dom.window.document);
      const article = readabilityReader.parse();

      if (!article) {
        throw new Error('Could not extract content from article');
      }

      res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'processing_content', message: 'Processing article content...' })}\n\n`);

      const enhancedHtml = `
        <html>
          <head><title>${article.title || 'Article'}</title></head>
          <body>
            <h1>${article.title || 'Article'}</h1>
            ${article.byline ? `<p class="byline">${article.byline}</p>` : ''}
            <div class="content">${article.content}</div>
          </body>
        </html>
      `;

      const doc = new JSDOM(enhancedHtml).window.document;
      finalText = doc.body.textContent || doc.body.innerText || '';

      // Process images with vision analysis if any
      res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'analyzing_images', message: 'Analyzing images...' })}\n\n`);

      const imgElements = Array.from(dom.window.document.querySelectorAll('img'));

      if (imgElements.length > 0) {
        try {
          logger.info(`Found ${imgElements.length} images, starting vision analysis...`);

          const processedImages = [];
          for (const img of imgElements.slice(0, 5)) {
            const imgUrl = img.src;
            if (!imgUrl || !imgUrl.startsWith('http')) continue;

            try {
              const imageResponse = await secureFetch(validateUrl(imgUrl), {
                timeout: 15000,
                maxSize: parseInt(process.env.MAX_IMAGE_SIZE) || 3 * 1024 * 1024,
                headers: { 'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8' }
              });

              if (imageResponse.ok) {
                const buffer = await imageResponse.arrayBuffer();
                const nodeBuffer = Buffer.from(buffer);
                const fileType = await fileTypeFromBuffer(nodeBuffer);
                const mediaType = fileType?.mime || imageResponse.headers.get('content-type') || 'image/jpeg';

                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (allowedTypes.includes(mediaType)) {
                  processedImages.push({
                    base64Data: nodeBuffer.toString('base64'),
                    mediaType: mediaType,
                    url: imgUrl
                  });
                }
              }
            } catch (imgError) {
              logger.warn(`Failed to process image ${imgUrl}:`, imgError.message);
            }
          }

          // Analyze images with the selected provider
          if (processedImages.length > 0) {

            try {
              // Skip vision analysis for Ollama with Qwen3-VL as it doesn't work properly
              if (selectedProvider === 'ollama') {
                logger.info('Skipping vision analysis for Ollama (currently not supported, results are better with just text analysis)');
                visionAnalysis = 'Vision analysis is not supported with the current Ollama configuration.';
              } else {
                logger.info(`Processing ${processedImages.length} images with ${selectedProvider} vision analysis`);
                const visionResult = await aiProvider.analyzeVision(processedImages, finalText);
                visionAnalysis = visionResult.analysisText;
                logger.info(`Vision analysis complete: ${visionAnalysis.length} chars`);
              }
            } catch (visionError) {
              logger.warn(`Vision analysis failed with ${selectedProvider}:`, visionError.message);
              // Continue without vision analysis
            }
          }
        } catch (err) {
          logger.warn('Image processing failed:', err.message);
          // Continue without vision analysis
        }
      }
    } else {
      // Use provided text
      finalText = text;
    }

    // Stream analysis
    res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'analyzing', message: `Analyzing with ${selectedProvider}...` })}\n\n`);

    await aiProvider.stream(
      { text: finalText, visionAnalysis, system },
      res
    );

    logger.info('AI streaming completed successfully');
    res.end();

  } catch (err) {
    logger.error('Unified streaming error:', { message: err.message, stack: err.stack });
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

// Legacy Claude streaming endpoint for backward compatibility
app.post('/api/claude-stream', rateLimits.streaming, async (req, res) => {
  logger.info('Starting full-pipeline streaming request...');
  logger.debug('Request body received', { hasUrl: !!req.body.url, hasText: !!req.body.text });
  
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const baseURL = process.env.ANTHROPIC_BASE_URL;
    logger.debug('API Key availability check', { available: !!apiKey, baseURLSet: !!baseURL });
    
    if (!apiKey) {
      logger.error('Missing Anthropic API key configuration');
      res.write(`data: ${JSON.stringify({ error: 'Server configuration error: Anthropic API key not configured' })}\n\n`);
      res.end();
      return;
    }

    const { url, text, system } = req.body;
    logger.debug('Processing request', { hasUrl: !!url, hasText: !!text, urlPreview: url?.substring(0, 50) });
    
    if (!url && !text) {
      logger.warn('Request missing both URL and text');
      res.write(`data: ${JSON.stringify({ error: 'Either URL or text is required' })}\n\n`);
      res.end();
      return;
    }

    let finalText;

    if (url) {
      // Step 1: Stream content preparation progress for URL
      res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'fetching_article', message: 'Fetching article content...' })}\n\n`);
      
      // Validate and fetch article using existing logic
      const validatedUrl = validateUrl(url);
      const response = await secureFetch(validatedUrl, { timeout: 30000 });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch article: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Parse with Readability
      const dom = new JSDOM(html, { url: validatedUrl.href });
      const readabilityReader = new Readability(dom.window.document);
      const article = readabilityReader.parse();
      
      if (!article) {
        throw new Error('Could not extract content from article');
      }

      res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'processing_content', message: 'Processing article content...' })}\n\n`);

      // Build enhanced HTML
      const enhancedHtml = `
        <html>
          <head><title>${article.title || 'Article'}</title></head>
          <body>
            <h1>${article.title || 'Article'}</h1>
            ${article.byline ? `<p class="byline">${article.byline}</p>` : ''}
            <div class="content">${article.content}</div>
          </body>
        </html>
      `;

      // Extract text content
      const doc = new JSDOM(enhancedHtml).window.document;
      finalText = doc.body.textContent || doc.body.innerText || '';

      // Step 2: Process images with vision analysis if any
      res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'analyzing_images', message: 'Analyzing images...' })}\n\n`);
      
      const imgElements = Array.from(dom.window.document.querySelectorAll('img'));
      
      if (imgElements.length > 0) {
        try {
          logger.info(`Found ${imgElements.length} images, starting vision analysis...`);
          
          // Download and process images
          const processedImages = [];
          for (const img of imgElements.slice(0, 5)) { // Limit to 5 images for performance
            const imgUrl = img.src;
            if (!imgUrl || !imgUrl.startsWith('http')) continue;
            
            try {
              // Use our secure image fetch endpoint internally
              const imageResponse = await secureFetch(validateUrl(imgUrl), {
                timeout: 15000,
                maxSize: parseInt(process.env.MAX_IMAGE_SIZE) || 3 * 1024 * 1024, // Configurable limit
                headers: { 'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8' }
              });
              
              if (imageResponse.ok) {
                const buffer = await imageResponse.arrayBuffer();
                const nodeBuffer = Buffer.from(buffer);
                const fileType = await fileTypeFromBuffer(nodeBuffer);
                const mediaType = fileType?.mime || imageResponse.headers.get('content-type') || 'image/jpeg';
                
                // Only process common image formats
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (allowedTypes.includes(mediaType)) {
                  processedImages.push({
                    base64Data: nodeBuffer.toString('base64'),
                    mediaType: mediaType,
                    url: imgUrl
                  });
                }
              }
            } catch (imgError) {
              logger.warn(`Failed to process image ${imgUrl}:`, imgError.message);
            }
          }
          
          // If we have images, analyze them with Claude
          if (processedImages.length > 0) {
            logger.info(`Processing ${processedImages.length} images with vision analysis`);
            
            const visionPrompt = `You are analyzing ${processedImages.length} images from a cybersecurity article to enhance threat intelligence analysis.

Article context (first 1000 chars):
${finalText.substring(0, 1000)}...

Please analyze the images and provide:
1. Technical details visible in screenshots (commands, file paths, network indicators)  
2. Attack techniques or tools shown
3. Any MITRE ATT&CK relevant information
4. System configurations or vulnerabilities displayed

Focus on actionable technical intelligence that supplements the article text.`;

            const messageContent = [{ type: 'text', text: visionPrompt }];
            for (const image of processedImages) {
              messageContent.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: image.mediaType,
                  data: image.base64Data
                }
              });
            }
            
            const anthropicConfig = { apiKey };
            if (baseURL) {
              anthropicConfig.baseURL = baseURL;
            }
            const anthropic = new Anthropic(anthropicConfig);
            const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
            const visionResponse = await anthropic.messages.create({
              model: model,
              max_tokens: 4000,
              temperature: 0.1,
              messages: [{ role: 'user', content: messageContent }]
            });
            
            const visionAnalysis = visionResponse.content[0]?.type === 'text' ? visionResponse.content[0].text : '';
            if (visionAnalysis.trim()) {
              finalText = `${finalText}\n\n=== VISION ANALYSIS ===\n${visionAnalysis}`;
              logger.info(`✅ Vision analysis completed: ${visionAnalysis.length} characters added`);
            }
          }
        } catch (visionError) {
          logger.warn('Vision analysis failed:', visionError.message);
          // Continue without vision analysis
        }
      }
    } else {
      // Use provided text directly
      res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'processing_content', message: 'Processing text content...' })}\n\n`);
      finalText = text;
    }

    // Step 3: Start AI streaming analysis
    res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'ai_analysis', message: 'Starting AI analysis...' })}\n\n`);

    const prompt = `You are an expert in cyber threat intelligence and MITRE ATT&CK. Analyze this article and create React Flow nodes and edges directly.

IMPORTANT: Return only a valid JSON object with "nodes" and "edges" arrays. No text before or after.

CRITICAL ORDERING FOR STREAMING VISUALIZATION:
1. Order ALL nodes strictly chronologically based on the attack timeline
2. In the "edges" array, place each edge IMMEDIATELY after its corresponding source node appears in the "nodes" array
3. Group by attack stages in order: Initial Access → Execution → Persistence → Privilege Escalation → Defense Evasion → Credential Access → Discovery → Lateral Movement → Collection → Exfiltration → Command & Control → Impact
4. This creates a narrative flow where connections appear as the story unfolds
5. IMPORTANT: The order of items in BOTH arrays matters for real-time streaming

Extract from the ENTIRE article including main text, IOC sections, detection/prevention recommendations, and technical appendices. Be thorough - extract ALL techniques mentioned or implied.

OUTPUT FORMAT: Create React Flow nodes and edges using ONLY these official AFB node types:
- **action**: MITRE ATT&CK techniques (T1078, T1190, etc.)
- **tool**: Legitimate software used in attacks (net.exe, powershell.exe, etc.)
- **malware**: Malicious software (webshells, backdoors, trojans, etc.)  
- **asset**: Target systems and resources (servers, workstations, databases, etc.)
- **infrastructure**: Adversary-controlled resources (C2 servers, domains, IP addresses)
- **url**: Web resources and links (malicious URLs, download links)
- **vulnerability**: Only CVE-identified vulnerabilities (CVE-YYYY-NNNN format)
- **AND_operator**: Logic gates requiring ALL conditions
- **OR_operator**: Logic gates where ANY condition can be met

STRICT EXTRACTION RULES - NO SPECULATION OR INFERENCE:
- ONLY extract information explicitly stated in the source text
- Command-line executions → tool nodes ONLY if exact commands are quoted in the article
- Malicious files/scripts → malware nodes ONLY if specific file names/hashes are mentioned
- IP addresses and domains → infrastructure nodes ONLY if explicitly listed
- Target computers/networks → asset nodes ONLY if specifically named in the text
- Web links → url nodes ONLY if actual URLs are provided
- Only CVEs → vulnerability nodes ONLY if CVE numbers are explicitly mentioned
- DO NOT infer, assume, or generate plausible technical details not in the source
- DO NOT create example commands or typical attack patterns
- If technical details are vague, keep descriptions general
- CRITICAL: For command_line fields, ONLY include commands explicitly quoted in the article
- CRITICAL: Each source_excerpt must be 2-3 complete sentences directly copied from the source text
- Source excerpts are used to validate extraction accuracy - they must prove the node exists in the source

EDGE TYPES (Create connections that show attack progression):
- action → tool/malware: "Uses"
- action → asset: "Targets"  
- action → infrastructure: "Communicates with"
- action → url: "Connects to"
- vulnerability → asset: "Affects"
- action → action: "Leads to" (IMPORTANT: Connect actions in chronological sequence)

NARRATIVE FLOW INSTRUCTIONS:
1. Start with Initial Access techniques (TA0001)
2. Progress through Execution → Persistence → Privilege Escalation → etc.
3. Connect each action to the next logical step in the attack timeline
4. Use "Leads to" edges to show attack progression between techniques
5. Order nodes so the attack story unfolds from top to bottom

CRITICAL JSON FORMAT - Follow this EXACT structure:
{
  "nodes": [
    {
      "id": "action-1",
      "type": "action",
      "data": {
        "type": "action",
        "name": "Valid Accounts",
        "description": "How this technique was used in this specific attack",
        "technique_id": "T1078",
        "tactic_id": "TA0001",
        "tactic_name": "Initial Access",
        "source_excerpt": "2-3 complete sentences directly quoted from the source article that support this technique. Include surrounding context to validate the extraction.",
        "confidence": "high"
      }
    },
    {
      "id": "tool-1", 
      "type": "tool",
      "data": {
        "type": "tool",
        "name": "Net.exe",
        "description": "Used to enumerate domain users", 
        "command_line": "net user /domain",
        "source_excerpt": "2-3 complete sentences from the source that mention this specific command or tool usage",
        "confidence": "high"
      }
    },
    {
      "id": "asset-1",
      "type": "asset",
      "data": {
        "type": "asset",
        "name": "Domain Controller",
        "description": "Target system compromised",
        "role": "Server",
        "source_excerpt": "2-3 complete sentences from the source describing this asset or target system",
        "confidence": "high"
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
    },
    {
      "id": "edge-2",
      "source": "action-1",
      "target": "asset-1", 
      "type": "floating",
      "label": "Targets"
    }
  ]
}

Article: "${finalText.substring(0, 50000)}"

Article text:
`;

    const anthropicApiUrl = baseURL ? `${baseURL}/v1/messages` : 'https://api.anthropic.com/v1/messages';
    const aiResponse = await fetch(anthropicApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
        max_tokens: 16000,
        temperature: 0.1,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
        system: system || "You are an expert in cyber threat intelligence analysis."
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      res.write(`data: ${JSON.stringify({ error })}\n\n`);
      res.end();
      return;
    }

    // Stream AI response - node-fetch uses different API than browser fetch
    if (!aiResponse.body) {
      throw new Error('No response body available');
    }

    // Handle streaming with node-fetch - it uses Node.js streams, not ReadableStream
    aiResponse.body.on('data', (chunk) => {
      const data = chunk.toString();
      logger.debug('Streaming chunk to client', { preview: data.slice(0, 100) });
      res.write(data);
    });

    aiResponse.body.on('end', () => {
      logger.info('AI streaming completed successfully');
      res.write(`data: [DONE]\n\n`);
      res.end();
    });

    aiResponse.body.on('error', (error) => {
      logger.error('AI streaming error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    });

  } catch (err) {
    logger.error('Full-pipeline streaming error:', { message: err.message, stack: err.stack });
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

// Proxy Anthropic API requests
const anthropicTarget = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
app.use('/anthropic', createProxyMiddleware({
  target: anthropicTarget,
  changeOrigin: true,
  pathRewrite: {
    '^/anthropic': '',
  },
  onProxyReq: () => {
    // CORS already handled by app.use(cors()) middleware - no need to override
  },
  onError: (err, _req, res) => {
    logger.error('Proxy error:', err);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: err.message,
      timestamp: new Date().toISOString()
    });
  },
}));

// Error handling middleware
app.use((err, _req, res, _next) => {
  logger.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Serve React app for any non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // 404 handler for development
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not found',
      message: `Route ${req.originalUrl} not found`,
      timestamp: new Date().toISOString()
    });
  });
}

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});
