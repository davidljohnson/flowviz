import rateLimit from 'express-rate-limit';
import { logger } from './src/shared/utils/logger.js';

// Shared URL validation to prevent SSRF attacks.
//
// Two things matter here and only one of them is this function. Checking the
// URL a user submitted is necessary but not sufficient, because a server that
// passes this check can answer with a redirect to one that would not - see
// secureFetch, which re-runs this on every hop for exactly that reason.
//
// What this cannot do is resolve names. A hostname that looks public and
// resolves to a private address still passes, so a deployment that treats
// internal reachability as a security boundary wants egress rules as well.

/** IPv6 literals arrive from URL.hostname wrapped in brackets. */
const stripBrackets = (host) =>
  host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;

function isPrivateIPv4(host) {
  const parts = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!parts) return false;
  const [a, b] = [Number(parts[1]), Number(parts[2])];
  if (a === 0) return true;                          // this network
  if (a === 127) return true;                        // loopback, the whole /8
  if (a === 10) return true;                         // private
  if (a === 172 && b >= 16 && b <= 31) return true;  // private
  if (a === 192 && b === 168) return true;           // private
  if (a === 192 && b === 0) return true;             // protocol assignments
  if (a === 169 && b === 254) return true;           // link-local, incl. cloud metadata
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a >= 224) return true;                         // multicast and reserved
  return false;
}

function isPrivateHost(hostname) {
  const host = stripBrackets(hostname.toLowerCase());

  if (host === 'localhost' || host.endsWith('.localhost')) return true;

  if (host.includes(':')) {
    if (host === '::1' || host === '::') return true;
    // An IPv4 address written as IPv6 is still that address. The URL parser
    // normalises ::ffff:127.0.0.1 to its hex form (::ffff:7f00:1), so the
    // dotted spelling never survives to be matched - both are handled.
    const dotted = host.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (dotted) return isPrivateIPv4(dotted[1]);
    const hex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const packed = (parseInt(hex[1], 16) << 16) | parseInt(hex[2], 16);
      return isPrivateIPv4([24, 16, 8, 0].map((sh) => (packed >>> sh) & 0xff).join('.'));
    }
    const head = host.split(':')[0];
    if (/^f[cd]/.test(head)) return true;   // fc00::/7  unique-local
    if (/^fe[89ab]/.test(head)) return true; // fe80::/10 link-local
    return false;
  }

  // Decimal and octal forms (2130706433, 0177.0.0.1) never reach here as
  // written: the URL parser normalises them to dotted quad first.
  return isPrivateIPv4(host);
}

export function validateUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch (error) {
    throw new Error(`Invalid URL: ${error.message}`);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP and HTTPS protocols are allowed');
  }

  if (isPrivateHost(url.hostname)) {
    throw new Error('Access to private and loopback addresses is not allowed');
  }

  return url;
}

/** Status codes that carry a Location we are willing to follow. */
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Read a body, refusing to buffer more than `maxSize`.
 *
 * The cap has to be counted here rather than handed to fetch: `size` is a
 * node-fetch option and this module runs on the global fetch, which ignores it.
 * It was ignoring it silently, so the only limit that ever applied was the
 * caller measuring the string it had already downloaded in full.
 *
 * Returns a fresh Response over the bytes actually read, so callers keep
 * .ok/.status/.headers/.text()/.arrayBuffer() as before.
 */
async function readCapped(response, maxSize) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxSize) {
    throw new Error(`Response too large: ${declared} bytes exceeds the ${maxSize} byte limit`);
  }
  if (!response.body) return response;

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxSize) {
      await reader.cancel();
      throw new Error(`Response too large: exceeds the ${maxSize} byte limit`);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/**
 * Fetch with the SSRF guard applied to every hop, not just the first.
 *
 * Redirects are followed by hand. Left to the default, a host that passes
 * validateUrl can answer 302 and send the request somewhere that would not -
 * cloud metadata, a container network, anything on the loopback - and the
 * check would never see the address it actually reached.
 *
 * A URL object is taken as already validated, which is how the routes call
 * this: they validate the request's url so they can answer 400 themselves.
 * A string is validated here. Every hop after the first is validated here
 * either way, since nobody else is in a position to.
 */
export async function secureFetch(url, options = {}) {
  const maxSize = options.maxSize || 10 * 1024 * 1024;
  const maxRedirects = options.maxRedirects ?? 5;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);

  const defaultHeaders = {
    'User-Agent': 'FlowViz/1.0 (+https://github.com/davidljohnson/flowviz)',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
  };

  try {
    let current = url instanceof URL ? url : validateUrl(String(url));

    for (let hop = 0; ; hop++) {
      const response = await fetch(current.href, {
        method: 'GET',
        headers: { ...defaultHeaders, ...options.headers },
        signal: controller.signal,
        redirect: 'manual',
      });

      const location = response.headers.get('location');
      if (!REDIRECT_STATUSES.has(response.status) || !location) {
        return await readCapped(response, maxSize);
      }

      if (hop >= maxRedirects) {
        throw new Error(`Too many redirects (limit ${maxRedirects})`);
      }
      // Relative Locations are legal, so resolve before validating.
      current = validateUrl(new URL(location, current).href);
    }
  } finally {
    clearTimeout(timeout);
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
  }),

  // Looser than streaming: one chat conversation is many small requests, and
  // sharing the analysis window would let a chat starve analysis (or vice versa)
  assistant: createRateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: parseInt(process.env.RATE_LIMIT_ASSISTANT) || 20,
    message: 'Too many assistant requests from this IP, please try again later.'
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