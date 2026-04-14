import { useState, useCallback, useRef } from 'react';
import { ORCHESTRATOR_URL } from '@/lib/contracts';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * useOrchestratorChat
 * Streams responses from POST /api/chat.
 * The Orchestrator returns a raw chunked text stream (not SSE),
 * so we read it with a ReadableStream reader and append chunks as they arrive.
 */
export function useOrchestratorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Abort controller ref — lets us cancel mid-stream
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isStreaming) return;

    setError(null);

    // Sanitize input
    const sanitizedInput = userInput.trim().replace(/[<>\"'&]/g, '');

    // Append user message immediately
    const userMessage: ChatMessage = { role: 'user', content: sanitizedInput };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    // Placeholder for streaming assistant reply
    const assistantPlaceholder: ChatMessage = { role: 'assistant', content: '' };
    setMessages([...nextMessages, assistantPlaceholder]);
    setIsStreaming(true);

    // Cancel any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Orchestrator returned ${res.status}: ${await res.text()}`);
      }

      if (!res.body) throw new Error('No response body');

      // ── Stream reading ────────────────────────────────────────────────────
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        // Update the last message (assistant placeholder) with accumulated text
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: accumulated };
          return updated;
        });
      }

      // Finalise
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: accumulated };
        return updated;
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return; // user cancelled

      let msg = 'Unknown error';

      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          msg = 'Orchestrator offline. Start it with `cd agents && npm run dev`.';
        } else if (err.message.includes('429') || err.message.includes('Quota') || err.message.includes('quota')) {
          msg = 'AI service quota exceeded. Please try again later or contact support for increased limits.';
        } else {
          msg = err.message;
        }
      }

      setError(msg);

      // Replace the empty assistant placeholder with the error
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `⚠ ${msg}`,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [messages, isStreaming]);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, sendMessage, isStreaming, cancelStream, clearHistory, error };
}
