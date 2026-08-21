import { useCallback, useRef, useState } from 'react';
import { AssistantOp, ChatMessage, OpResult } from '../types';
import { streamAssistant } from '../services/assistantClient';
import { SerializedGraph, SerializedContext } from '../services/graphContext';

const HISTORY_CAP = 20;

interface UseAssistantParams {
  provider?: string;
  model?: string;
  getGraph: () => SerializedGraph;
  getContexts: () => SerializedContext[];
  /** The source article behind the canvas, or null when there is none. */
  getSourceText: () => string | null;
  /** Apply one op to the canvas as it streams; returns its verdict. */
  applyOp: (op: AssistantOp) => OpResult;
  /** Close the turn: commit the undo batch (ok) or roll it back (!ok). */
  finishTurn: (instruction: string, ok: boolean) => void;
}

// Keep the article's share of the context bounded; the server caps again
const SOURCE_TEXT_CAP = 15000;

/** Summary suffix sent with history so the model knows what its ops did. */
const summarizeResults = (results: OpResult[]): string => {
  const appliedCount = results.filter(r => r.status === 'applied').length;
  const skippedCount = results.length - appliedCount;
  if (results.length === 0) return '';
  const parts = [`${appliedCount} applied`];
  if (skippedCount > 0) parts.push(`${skippedCount} skipped`);
  return ` [ops: ${parts.join(', ')}]`;
};

export function useAssistant({ provider, model, getGraph, getContexts, getSourceText, applyOp, finishTurn }: UseAssistantParams) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  // The in-flight reply's message text as it streams; null when idle
  const [streamingText, setStreamingText] = useState<string | null>(null);

  // send() reads history through a ref so it never captures a stale list
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // The in-flight turn's controller, so stop() can reach a request that send()
  // is still awaiting. Cleared in the same finally that clears `pending`.
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const history = messagesRef.current
      .filter((m): m is ChatMessage & { role: 'user' | 'assistant' } => m.role !== 'error')
      .slice(-HISTORY_CAP + 1)
      .map(m => ({
        role: m.role,
        content: m.role === 'assistant' ? m.text + summarizeResults(m.opResults ?? []) : m.text,
      }));

    // Read once and reuse: the row is live against the graph, so resolving it
    // twice could put different chips on the bubble than went up the wire.
    const contexts = getContexts();

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed,
      ...(contexts.length > 0 && { contexts }),
    }]);
    setPending(true);
    setStreamingText(null);

    // Ops apply as their JSON completes on the wire, so big builds appear
    // node by node like an analysis does; the turn still lands as ONE undo
    // entry because the component brackets it (batch opens at the first
    // applied op, closes in finishTurn).
    const opResults: OpResult[] = [];
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await streamAssistant({
        provider,
        model,
        messages: [...history, { role: 'user', content: trimmed }],
        graph: getGraph(),
        contexts,
        sourceText: getSourceText()?.slice(0, SOURCE_TEXT_CAP) ?? null,
      }, {
        onMessageDelta: setStreamingText,
        onOp: (op) => opResults.push(applyOp(op as AssistantOp)),
      }, controller.signal);

      // Stragglers the incremental parser didn't see (e.g. fence-fallback parse).
      // A stopped turn has none worth chasing - the response carries only what
      // had already gone out through onOp, so applying it again would double it.
      if (!response.stopped) {
        response.ops?.slice(opResults.length).forEach(op => opResults.push(applyOp(op)));
      }

      // Edits made before the stop are kept, and committed as the single undo
      // entry the turn would have been. They are whole ops that the reader
      // watched land, and keeping them is the recoverable choice: one Ctrl+Z
      // removes them, while discarding them puts back nothing.
      finishTurn(trimmed, true);

      const appliedCount = opResults.filter(r => r.status === 'applied').length;
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: response.message || (appliedCount > 0 ? 'Done.' : ''),
        opResults,
        ...(response.stopped && { stopped: true }),
      }]);
    } catch (err) {
      // A failed turn takes its partial edits with it
      finishTurn(trimmed, false);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'error',
        text: err instanceof Error ? err.message : 'Something went wrong',
      }]);
    } finally {
      abortRef.current = null;
      setPending(false);
      setStreamingText(null);
    }
  }, [provider, model, getGraph, getContexts, getSourceText, applyOp, finishTurn]);

  /**
   * End the turn in flight. Safe to call when nothing is running.
   *
   * The abort travels the whole way: it cancels the fetch, which closes the
   * socket, which is what tells the server to drop its own call to the model.
   * Stopping the words on screen without stopping the work behind them would
   * leave the request running and billing to no one's benefit.
   */
  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => setMessages([]), []);

  /** Replace the conversation wholesale - restoring a saved flow's chat. */
  const restore = useCallback((restored: ChatMessage[]) => setMessages(restored), []);

  return { messages, pending, streamingText, send, stop, clear, restore };
}
