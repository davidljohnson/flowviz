import { AssistantResponse } from '../types';
import { SerializedGraph, SerializedContext } from './graphContext';
import { apiFetch } from '../../../shared/services/api/apiClient';

export interface AssistantRequest {
  provider?: string;
  model?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  graph: SerializedGraph;
  contexts?: SerializedContext[];
  /** The article/report behind the canvas, capped by the caller. */
  sourceText?: string | null;
}

/**
 * Decode the value of the "message" key from a PARTIAL JSON response, so the
 * answer can render while it streams. Returns the message-so-far, or null if
 * the key hasn't opened yet. Handles JSON string escapes; a trailing
 * incomplete escape (e.g. a half-received \u sequence) is held back.
 */
export const extractPartialMessage = (raw: string): string | null => {
  const keyMatch = raw.match(/"message"\s*:\s*"/);
  if (!keyMatch || keyMatch.index === undefined) return null;

  let out = '';
  let i = keyMatch.index + keyMatch[0].length;
  while (i < raw.length) {
    const char = raw[i];
    if (char === '"') return out; // string closed - message complete
    if (char !== '\\') {
      out += char;
      i += 1;
      continue;
    }
    // Escape sequence; if it runs past the buffer, hold it back until more
    // text arrives rather than emitting a mangled character
    const next = raw[i + 1];
    if (next === undefined) return out;
    if (next === 'u') {
      const hex = raw.slice(i + 2, i + 6);
      if (hex.length < 4) return out;
      out += String.fromCharCode(parseInt(hex, 16));
      i += 6;
      continue;
    }
    const simple: Record<string, string> = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f' };
    out += simple[next] ?? next;
    i += 2;
  }
  return out;
};

/**
 * Parse every COMPLETE op object out of the partial JSON's "ops" array, so
 * edits can apply while the response streams. Stateless over the buffer: the
 * caller tracks how many it has already emitted and takes the tail.
 */
export const extractCompleteOps = (raw: string): unknown[] => {
  const key = raw.match(/"ops"\s*:\s*\[/);
  if (!key || key.index === undefined) return [];

  const ops: unknown[] = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let start = -1;
  for (let i = key.index + key[0].length; i < raw.length; i++) {
    const char = raw[i];
    if (inString) {
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === '{') {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        try {
          ops.push(JSON.parse(raw.slice(start, i + 1)));
        } catch {
          // Malformed object; the final full parse will skip it the same way
        }
        start = -1;
      }
      continue;
    }
    if (char === ']' && depth === 0) break; // ops array closed
  }
  return ops;
};

/** Unwrap ```json fences, or fish the outermost object out of surrounding prose. */
const extractJson = (raw: string): string => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenced) return fenced[1];
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
};

export interface AssistantStreamCallbacks {
  /** The reply's message text so far, re-emitted as it grows. */
  onMessageDelta?: (messageSoFar: string) => void;
  /** Each op exactly once, as soon as its JSON object completes on the wire. */
  onOp?: (op: unknown) => void;
}

/**
 * POST the conversation + graph to /api/assistant-stream and resolve with the
 * parsed { message, ops } object. Both the message text and the ops surface
 * incrementally through the callbacks as they stream; the resolved ops array
 * is the full list, so callers that applied ops via onOp should take
 * ops.slice(<count already applied>) for any stragglers the incremental
 * parser missed.
 *
 * Aborting `signal` ends the turn where it stands: the fetch is cancelled, the
 * server sees the socket close and drops its own upstream call, and this
 * resolves with `stopped: true` carrying whatever had already arrived. It does
 * not reject, because being stopped on purpose is not a failure and the caller
 * should not have to tell the two apart in a catch block.
 */
export async function streamAssistant(
  request: AssistantRequest,
  callbacks?: AssistantStreamCallbacks,
  signal?: AbortSignal,
): Promise<AssistantResponse> {
  const { onMessageDelta, onOp } = callbacks ?? {};
  const response = await apiFetch('/api/assistant-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    let message = `Assistant request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // Non-JSON error body; keep the status message
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error('No response body from assistant');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let responseText = '';
  let emittedLength = 0;
  let emittedOps = 0;
  let done = false;
  let stopped = false;

  while (!done) {
    let value: Uint8Array | undefined;
    try {
      const chunk = await reader.read();
      if (chunk.done) break;
      value = chunk.value;
    } catch (err) {
      // Aborting rejects the pending read. That is this function being told to
      // stop, not a failure to report - so it leaves the loop and returns what
      // arrived, the same as any other ending.
      if (signal?.aborted) { stopped = true; break; }
      throw err;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') {
        done = true;
        break;
      }
      try {
        const event = JSON.parse(payload);
        if (event?.type === 'error') {
          throw new Error(event.error || 'Assistant error');
        }
        // Covers both Claude's native SSE passthrough and the synthesized
        // content_block_delta events from the other providers
        if (typeof event?.delta?.text === 'string') {
          responseText += event.delta.text;
        }
      } catch (err) {
        if (err instanceof SyntaxError) continue; // partial/foreign line
        throw err;
      }
    }

    if (onMessageDelta) {
      const partial = extractPartialMessage(responseText);
      if (partial !== null && partial.length > emittedLength) {
        emittedLength = partial.length;
        onMessageDelta(partial);
      }
    }

    if (onOp) {
      const completeOps = extractCompleteOps(responseText);
      for (; emittedOps < completeOps.length; emittedOps++) {
        onOp(completeOps[emittedOps]);
      }
    }
  }

  if (stopped) {
    // The buffer is a half-written object, so the parse below would fail and
    // fall through to the raw-text fallback - printing braces and op JSON into
    // the conversation. The partial reader gives the prose on its own, and the
    // ops that completed have already gone out through onOp.
    return {
      message: extractPartialMessage(responseText) ?? undefined,
      ops: extractCompleteOps(responseText) as AssistantResponse['ops'],
      stopped: true,
    };
  }

  try {
    const parsed = JSON.parse(extractJson(responseText));
    if (parsed && (typeof parsed.message === 'string' || Array.isArray(parsed.ops))) {
      return {
        message: typeof parsed.message === 'string' ? parsed.message : undefined,
        ops: Array.isArray(parsed.ops) ? parsed.ops : undefined,
      };
    }
  } catch {
    // Fall through to the raw-text fallback
  }

  if (responseText.trim()) {
    // The model broke the JSON contract; surface its text as a plain answer
    return { message: responseText.trim() };
  }
  throw new Error('Assistant returned an empty response');
}
