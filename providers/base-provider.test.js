import { describe, it, expect, vi } from 'vitest';
import { BaseProvider } from './base-provider.js';

describe('BaseProvider', () => {
  // ── Constructor / getName ─────────────────────────────────────────

  it('stores config properties', () => {
    const provider = new BaseProvider({
      apiKey: 'sk-test',
      model: 'my-model',
      baseUrl: 'https://api.example.com',
      providerName: 'TestProvider'
    });
    expect(provider.apiKey).toBe('sk-test');
    expect(provider.model).toBe('my-model');
    expect(provider.baseUrl).toBe('https://api.example.com');
    expect(provider.getName()).toBe('TestProvider');
  });

  it('defaults providerName to "unknown"', () => {
    const provider = new BaseProvider({ apiKey: 'k', model: 'm' });
    expect(provider.getName()).toBe('unknown');
  });

  // ── Abstract methods ──────────────────────────────────────────────

  it('stream() throws with provider name', async () => {
    const provider = new BaseProvider({ apiKey: 'k', model: 'm', providerName: 'MyAI' });
    await expect(provider.stream({}, {})).rejects.toThrow('stream() must be implemented by MyAI provider');
  });

  it('analyzeVision() throws with provider name', async () => {
    const provider = new BaseProvider({ apiKey: 'k', model: 'm', providerName: 'MyAI' });
    await expect(provider.analyzeVision('img', 'image/png', 'prompt'))
      .rejects.toThrow('analyzeVision() must be implemented by MyAI provider');
  });

  it('formatPrompt() throws with provider name', () => {
    const provider = new BaseProvider({ apiKey: 'k', model: 'm', providerName: 'MyAI' });
    expect(() => provider.formatPrompt('text', null, 'system'))
      .toThrow('formatPrompt() must be implemented by MyAI provider');
  });

  // ── isConfigured() ────────────────────────────────────────────────

  describe('isConfigured()', () => {
    it('returns true when both apiKey and model are set', () => {
      const provider = new BaseProvider({ apiKey: 'key', model: 'model' });
      expect(provider.isConfigured()).toBe(true);
    });

    it('returns false when apiKey is missing', () => {
      const provider = new BaseProvider({ model: 'model' });
      expect(provider.isConfigured()).toBe(false);
    });

    it('returns false when model is missing', () => {
      const provider = new BaseProvider({ apiKey: 'key' });
      expect(provider.isConfigured()).toBe(false);
    });

    it('returns false when both are missing', () => {
      const provider = new BaseProvider({});
      expect(provider.isConfigured()).toBe(false);
    });
  });

  // ── SSE helpers ───────────────────────────────────────────────────

  describe('SSE helpers', () => {
    function mockRes() {
      return { write: vi.fn() };
    }

    it('sendSSE writes JSON with SSE format', () => {
      const provider = new BaseProvider({ apiKey: 'k', model: 'm' });
      const res = mockRes();
      provider.sendSSE(res, { type: 'test', value: 42 });
      expect(res.write).toHaveBeenCalledWith(
        'data: {"type":"test","value":42}\n\n'
      );
    });

    it('sendSSEComplete writes [DONE]', () => {
      const provider = new BaseProvider({ apiKey: 'k', model: 'm' });
      const res = mockRes();
      provider.sendSSEComplete(res);
      expect(res.write).toHaveBeenCalledWith('data: [DONE]\n\n');
    });

    it('sendProgress sends progress event', () => {
      const provider = new BaseProvider({ apiKey: 'k', model: 'm' });
      const res = mockRes();
      provider.sendProgress(res, 'analyzing', 'Processing article...');
      const call = res.write.mock.calls[0][0];
      const data = JSON.parse(call.replace('data: ', '').trim());
      expect(data).toEqual({
        type: 'progress',
        stage: 'analyzing',
        message: 'Processing article...'
      });
    });

    it('sendError sends error event', () => {
      const provider = new BaseProvider({ apiKey: 'k', model: 'm' });
      const res = mockRes();
      provider.sendError(res, 'Something broke');
      const call = res.write.mock.calls[0][0];
      const data = JSON.parse(call.replace('data: ', '').trim());
      expect(data).toEqual({ type: 'error', error: 'Something broke' });
    });

    it('sendContentDelta sends content_block_delta event', () => {
      const provider = new BaseProvider({ apiKey: 'k', model: 'm' });
      const res = mockRes();
      provider.sendContentDelta(res, 'Hello');
      const call = res.write.mock.calls[0][0];
      const data = JSON.parse(call.replace('data: ', '').trim());
      expect(data).toEqual({
        type: 'content_block_delta',
        delta: { text: 'Hello' }
      });
    });
  });
});
