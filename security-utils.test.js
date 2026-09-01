import { describe, it, expect } from 'vitest';
import { validateUrl, secureFetch, handleFetchError } from './security-utils.js';

describe('validateUrl', () => {
  // ── Valid URLs ──────────────────────────────────────────────────────

  it('allows valid HTTPS URL', () => {
    const url = validateUrl('https://example.com/article');
    expect(url).toBeInstanceOf(URL);
    expect(url.hostname).toBe('example.com');
  });

  it('allows valid HTTP URL', () => {
    const url = validateUrl('http://example.com/article');
    expect(url.protocol).toBe('http:');
  });

  it('allows public IP address', () => {
    const url = validateUrl('https://8.8.8.8/path');
    expect(url.hostname).toBe('8.8.8.8');
  });

  // ── Blocked protocols ─────────────────────────────────────────────

  it('blocks ftp protocol', () => {
    expect(() => validateUrl('ftp://example.com/file'))
      .toThrow('Only HTTP and HTTPS protocols are allowed');
  });

  it('blocks file protocol', () => {
    expect(() => validateUrl('file:///etc/passwd'))
      .toThrow('Only HTTP and HTTPS protocols are allowed');
  });

  it('blocks data protocol', () => {
    expect(() => validateUrl('data:text/html,<script>alert(1)</script>'))
      .toThrow();
  });

  // ── Localhost blocking ────────────────────────────────────────────

  it('blocks localhost', () => {
    expect(() => validateUrl('http://localhost/admin'))
      .toThrow('Access to private and loopback addresses is not allowed');
  });

  it('blocks 127.0.0.1', () => {
    expect(() => validateUrl('http://127.0.0.1:3001/api'))
      .toThrow('Access to private and loopback addresses is not allowed');
  });

  it('blocks IPv6 loopback ::1', () => {
    expect(() => validateUrl('http://[::1]/api'))
      .toThrow('Access to private and loopback addresses is not allowed');
  });

  // ── Private IP range blocking ─────────────────────────────────────

  it('blocks 10.x.x.x (Class A private)', () => {
    expect(() => validateUrl('http://10.0.0.1/internal'))
      .toThrow('Access to private and loopback addresses is not allowed');
  });

  it('blocks 172.16.x.x (Class B private)', () => {
    expect(() => validateUrl('http://172.16.0.1/internal'))
      .toThrow('Access to private and loopback addresses is not allowed');
  });

  it('blocks 172.31.x.x (top of Class B private range)', () => {
    expect(() => validateUrl('http://172.31.255.255/internal'))
      .toThrow('Access to private and loopback addresses is not allowed');
  });

  it('blocks 192.168.x.x (Class C private)', () => {
    expect(() => validateUrl('http://192.168.1.1/router'))
      .toThrow('Access to private and loopback addresses is not allowed');
  });

  // ── Dangerous IP ranges ───────────────────────────────────────────

  it('blocks link-local 169.254.x.x', () => {
    expect(() => validateUrl('http://169.254.169.254/latest/meta-data'))
      .toThrow('Access to private and loopback addresses is not allowed');
  });

  it('blocks multicast 224.x.x.x', () => {
    expect(() => validateUrl('http://224.0.0.1/multicast'))
      .toThrow('Access to private and loopback addresses is not allowed');
  });

  it('blocks 0.x.x.x', () => {
    expect(() => validateUrl('http://0.0.0.0/'))
      .toThrow('Access to private and loopback addresses is not allowed');
  });

  it('blocks 240.x.x.x (reserved)', () => {
    expect(() => validateUrl('http://240.0.0.1/'))
      .toThrow('Access to private and loopback addresses is not allowed');
  });

  // ── Invalid URLs ──────────────────────────────────────────────────

  it('rejects completely invalid URL', () => {
    expect(() => validateUrl('not-a-url')).toThrow('Invalid URL');
  });

  it('rejects empty string', () => {
    expect(() => validateUrl('')).toThrow('Invalid URL');
  });
});

describe('handleFetchError', () => {
  it('returns 408 for AbortError (timeout)', () => {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    const result = handleFetchError(error, 'article');
    expect(result.status).toBe(408);
    expect(result.error).toBe('Request timeout');
  });

  it('returns 400 for Invalid URL errors', () => {
    const error = new Error('Invalid URL: bad stuff');
    const result = handleFetchError(error, 'article');
    expect(result.status).toBe(400);
    expect(result.error).toContain('Invalid URL');
  });

  it('returns 404 for ENOTFOUND', () => {
    const error = new Error('getaddrinfo ENOTFOUND example.invalid');
    error.code = 'ENOTFOUND';
    const result = handleFetchError(error, 'article');
    expect(result.status).toBe(404);
    expect(result.error).toBe('article not found');
  });

  it('returns 500 for generic errors', () => {
    const error = new Error('Something went wrong');
    const result = handleFetchError(error, 'resource');
    expect(result.status).toBe(500);
    expect(result.error).toBe('Failed to fetch resource');
    expect(result.details).toBe('Something went wrong');
  });

  it('uses default context "resource" when none provided', () => {
    const error = new Error('fail');
    error.code = 'ENOTFOUND';
    const result = handleFetchError(error);
    expect(result.error).toBe('resource not found');
  });
});

describe('validateUrl: addresses that used to slip through', () => {
  const blocked = (url) =>
    expect(() => validateUrl(url)).toThrow('Access to private and loopback addresses is not allowed');

  it('blocks the whole of 127.0.0.0/8, not just 127.0.0.1', () => {
    blocked('http://127.0.0.2/');
    blocked('http://127.255.255.254/');
  });

  it('blocks loopback written as IPv6', () => {
    // The URL parser normalises this to its hex form, ::ffff:7f00:1, so the
    // dotted spelling is not what the check ends up seeing.
    blocked('http://[::ffff:127.0.0.1]/');
    blocked('http://[::ffff:7f00:1]/');
  });

  it('blocks IPv6 unique-local and link-local', () => {
    blocked('http://[fd00::1]/');
    blocked('http://[fc00::1]/');
    blocked('http://[fe80::1]/');
  });

  it('blocks carrier-grade NAT', () => {
    blocked('http://100.64.0.1/');
    blocked('http://100.127.255.255/');
  });

  it('still allows public addresses either side of those ranges', () => {
    expect(validateUrl('http://100.63.255.255/').hostname).toBe('100.63.255.255');
    expect(validateUrl('http://100.128.0.1/').hostname).toBe('100.128.0.1');
    expect(validateUrl('http://126.0.0.1/').hostname).toBe('126.0.0.1');
    expect(validateUrl('http://[2606:4700::1]/').hostname).toBe('[2606:4700::1]');
  });
});

describe('secureFetch follows redirects under the same guard', () => {
  const listen = async (handler) => {
    const http = await import('node:http');
    const server = http.createServer(handler);
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    return { server, port: server.address().port };
  };

  it('refuses a redirect that lands on a private address', async () => {
    // The hop is what matters: the first URL passes the check and the second
    // does not, which is invisible to anything that validates only the input.
    const { server, port } = await listen((_q, s) => {
      s.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' });
      s.end();
    });
    try {
      await expect(secureFetch(new URL(`http://127.0.0.1:${port}/`), { timeout: 5000 }))
        .rejects.toThrow('Access to private and loopback addresses is not allowed');
    } finally { server.close(); }
  });

  it('gives up rather than following a redirect chain forever', async () => {
    // maxRedirects is checked before the hop is resolved, which is the only
    // way to reach it from a loopback fixture: with any budget left, the guard
    // above refuses the hop first and you get that error instead.
    const { server, port } = await listen((_q, s) => {
      s.writeHead(302, { Location: '/again' });
      s.end();
    });
    try {
      await expect(secureFetch(new URL(`http://127.0.0.1:${port}/`), { timeout: 5000, maxRedirects: 0 }))
        .rejects.toThrow('Too many redirects');
    } finally { server.close(); }
  });
});

describe('secureFetch caps the body it will buffer', () => {
  it('refuses a response larger than maxSize', async () => {
    const http = await import('node:http');
    // Chunked, so there is no content-length to short-circuit on: only
    // counting bytes as they arrive can catch this.
    const server = http.createServer((_q, s) => {
      s.writeHead(200, { 'Content-Type': 'text/html' });
      for (let i = 0; i < 64; i++) s.write('x'.repeat(1024));
      s.end();
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;
    try {
      await expect(secureFetch(new URL(`http://127.0.0.1:${port}/`), { timeout: 5000, maxSize: 4096 }))
        .rejects.toThrow('Response too large');
    } finally { server.close(); }
  });
});

