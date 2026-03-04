import rateLimit from 'express-rate-limit';
import { logger } from './src/shared/utils/logger.js';

// Shared URL validation to prevent SSRF attacks
export function validateUrl(urlString) {
  try {
    const url = new URL(urlString);
    
    // Only allow HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are allowed');
    }
    
    // Block localhost and private IP ranges
    const hostname = url.hostname.toLowerCase();
    
    // Block localhost variations (URL.hostname wraps IPv6 in brackets)
    if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)) {
      throw new Error('Localhost access is not allowed');
    }
    
    // Block private IP ranges
    if (hostname.match(/^192\.168\./)) {
      throw new Error('Private IP ranges are not allowed');
    }
    if (hostname.match(/^10\./)) {
      throw new Error('Private IP ranges are not allowed');
    }
    if (hostname.match(/^172\.(1[6-9]|2\d|3[01])\./)) {
      throw new Error('Private IP ranges are not allowed');
    }
    
    // Block other dangerous schemes
    if (hostname.match(/^(0\.|169\.254\.|224\.|240\.)/)) {
      throw new Error('Invalid IP range');
    }
    
    return url;
  } catch (error) {
    throw new Error(`Invalid URL: ${error.message}`);
  }
}

// Shared secure fetch with common security headers and limits
export async function secureFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);
  
  const defaultHeaders = {
    'User-Agent': 'FlowViz/1.0 (+https://github.com/flowviz/flowviz)',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
  };
  
  try {
    const response = await fetch(url.href, {
      method: 'GET',
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      signal: controller.signal,
      size: options.maxSize || 10 * 1024 * 1024, // 10MB default limit
    });
    
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// Rate limiting configurations
export const createRateLimit = (options) => rateLimit({
  windowMs: options.windowMs,
  max: options.max,
  message: {
    error: options.message
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Predefined rate limits with environment variable support
export const rateLimits = {
  articles: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_ARTICLES) || 10,
    message: 'Too many article fetch requests from this IP, please try again later.'
  }),
  
  images: createRateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes  
    max: parseInt(process.env.RATE_LIMIT_IMAGES) || 50,
    message: 'Too many image fetch requests from this IP, please try again later.'
  }),
  
  streaming: createRateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: parseInt(process.env.RATE_LIMIT_STREAMING) || 5, // Very strict for expensive AI calls
    message: 'Too many streaming analysis requests from this IP, please try again later.'
  })
};

// Common error handler for fetch operations
export function handleFetchError(error, context = 'resource') {
  logger.error(`Error fetching ${context}:`, error);
  
  if (error.name === 'AbortError') {
    return { status: 408, error: 'Request timeout' };
  }
  
  if (error.message.includes('Invalid URL')) {
    return { status: 400, error: error.message };
  }
  
  if (error.code === 'ENOTFOUND') {
    return { status: 404, error: `${context} not found` };
  }
  
  return { 
    status: 500, 
    error: `Failed to fetch ${context}`, 
    details: error.message 
  };
}