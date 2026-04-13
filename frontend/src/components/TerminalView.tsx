import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrchestratorChat } from "@/hooks/useOrchestratorChat";
import { useAppStore } from "@/store/appStore";

// ── Static activity log (shown above the chat when no messages yet) ──────────
const BOOT_LINES = [
  { time: "init", type: "system", text: "[INIT] Nexus.AI Orchestrator terminal ready." },
  { time: "init", type: "system", text: "[INIT] Multi-agent coordination layer online." },
  { time: "init", type: "execute", text: "[AGENT] Scanning X Layer Testnet mempool..." },
  { time: "init", type: "json", key: '"chain_id"', value: '"195"' },
  { time: "init", type: "json", key: '"rpc"', value: '"testrpc.xlayer.tech"' },
  { time: "init", type: "system", text: '[READY] Type a message to query the AI agent.' },
];

const SUGGESTIONS = [
  "What is the current vault risk status?",
  "Explain the delta-neutral strategy",
  "How does the drawdown limit protect users?",
  "Show me recent signal activity",
];

type LineType = "system" | "execute" | "json" | "user" | "assistant" | "error";

interface TerminalLine {
  time: string;
  type: LineType;
  text?: string;
  key?: string;
  value?: string;
  streaming?: boolean;
}

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function renderContent(line: TerminalLine) {
  if (line.type === "execute") {
    return <span className="text-primary">{line.text}</span>;
  }
  if (line.type === "json") {
    return (
      <>
        <span className="text-neon-cyan">{line.key}</span>
        <span className="text-muted-foreground">: </span>
        <span className="text-foreground/90">{line.value}</span>
      </>
    );
  }
  if (line.type === "user") {
    return (
      <span>
        <span className="text-primary/70">{">"} </span>
        <span className="text-foreground/90">{line.text}</span>
      </span>
    );
  }
  if (line.type === "assistant") {
    return (
      <span className="text-foreground/80 whitespace-pre-wrap leading-relaxed">
        {line.text}
        {line.streaming && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
            className="inline-block ml-0.5 w-1.5 h-3.5 bg-primary align-middle"
          />
        )}
      </span>
    );
  }
  if (line.type === "error") {
    return <span className="text-destructive/80">{line.text}</span>;
  }
  // system
  return <span className="text-muted-foreground">{line.text}</span>;
}

interface TerminalViewProps {
  compact?: boolean;
}

const TerminalView = ({ compact = false }: TerminalViewProps) => {
  const { messages, sendMessage, isStreaming, cancelStream, clearHistory } =
    useOrchestratorChat();
  const orchestratorStatus = useAppStore((s) => s.orchestratorStatus);

  const [input, setInput] = useState("");
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [inputHistory, setInputHistory] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Auto-scroll on new content ────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // ── Compose terminal lines from chat messages ─────────────────────────────
  const chatLines: TerminalLine[] = messages.flatMap((m, i) => {
    if (m.role === "user") {
      return [{ time: nowTime(), type: "user" as LineType, text: m.content }];
    }
    const isLast = i === messages.length - 1;
    return [
      {
        time: nowTime(),
        type: "assistant" as LineType,
        text: m.content || "",
        streaming: isLast && isStreaming,
      },
    ];
  });

  const allLines: TerminalLine[] = messages.length === 0
    ? BOOT_LINES as TerminalLine[]
    : [...(BOOT_LINES as TerminalLine[]), ...chatLines];

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInputHistory((h) => [trimmed, ...h.slice(0, 49)]);
    setHistoryIdx(-1);
    setInput("");
    sendMessage(trimmed);
  };

  // ── Keyboard: Enter, up/down history, Escape ─────────────────────────────
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { handleSend(); return; }
    if (e.key === "Escape" && isStreaming) { cancelStream(); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = Math.min(historyIdx + 1, inputHistory.length - 1);
      setHistoryIdx(idx);
      setInput(inputHistory[idx] ?? "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(idx);
      setInput(idx === -1 ? "" : inputHistory[idx] ?? "");
    }
  };

  return (
    <div className="terminal-window h-full flex flex-col">
      {/* ── Title bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neon-cyan/10 flex-shrink-0">
        <div className="w-3 h-3 rounded-full bg-destructive/60" />
        <div className="w-3 h-3 rounded-full bg-amber-400/60" />
        <div className="w-3 h-3 rounded-full bg-neon-cyan/60" />
        <span className="ml-3 text-[11px] font-mono text-muted-foreground tracking-wider uppercase flex-1">
          nexus://terminal
        </span>

        {/* Orchestrator status */}
        <div className="flex items-center gap-1.5 mr-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              orchestratorStatus === "online"
                ? "bg-neon-mint animate-pulse-glow"
                : orchestratorStatus === "degraded"
                ? "bg-amber-400"
                : "bg-destructive/60"
            }`}
          />
          <span className="text-[10px] font-mono text-muted-foreground capitalize">
            {orchestratorStatus}
          </span>
        </div>

        {/* Clear button */}
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-[10px] font-mono text-muted-foreground/60 hover:text-muted-foreground transition-colors uppercase tracking-wider"
          >
            clear
          </button>
        )}
      </div>

      {/* ── Output area ────────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto custom-scrollbar font-mono space-y-1 min-h-0"
        onClick={() => inputRef.current?.focus()}
      >
        {allLines.map((line, i) => (
          <div
            key={i}
            className={`flex gap-3 ${compact ? "text-[11px]" : "text-[13px]"} leading-relaxed`}
          >
            <span className="text-muted-foreground/40 shrink-0 select-none tabular-nums">
              [{line.time}]
            </span>
            <span className="font-mono break-words min-w-0">{renderContent(line)}</span>
          </div>
        ))}

        {/* Streaming indicator */}
        {isStreaming && messages.length === 0 && (
          <div className="flex gap-3 text-[13px]">
            <span className="text-muted-foreground/40 shrink-0">[{nowTime()}]</span>
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.7 }}
              className="text-primary font-mono"
            >
              ▋
            </motion.span>
          </div>
        )}
      </div>

      {/* ── Suggestions (shown only when no messages yet) ───────────────────── */}
      <AnimatePresence>
        {messages.length === 0 && !compact && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="px-4 pb-3 flex flex-wrap gap-2"
          >
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { setInput(s); inputRef.current?.focus(); }}
                className="text-[11px] font-mono px-3 py-1.5 rounded-inner bg-foreground/[0.04] border border-foreground/[0.06] text-muted-foreground hover:text-foreground/80 hover:border-foreground/10 transition-all"
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input bar ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-neon-cyan/10 px-4 py-3 flex items-center gap-3">
        <span className="text-primary font-mono text-sm select-none flex-shrink-0">❯</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setHistoryIdx(-1); }}
          onKeyDown={handleKeyDown}
          placeholder={
            orchestratorStatus === "offline"
              ? "Orchestrator offline — start it first"
              : isStreaming
              ? "Streaming… (Esc to cancel)"
              : "Ask the agent anything..."
          }
          disabled={orchestratorStatus === "offline"}
          className="flex-1 bg-transparent font-mono text-[13px] text-foreground/80 placeholder:text-muted-foreground/30 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
          autoFocus
        />

        {isStreaming ? (
          <button
            onClick={cancelStream}
            className="text-[10px] font-mono text-destructive/60 hover:text-destructive/80 uppercase tracking-wider transition-colors flex-shrink-0"
          >
            stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim() || orchestratorStatus === "offline"}
            className="text-[10px] font-mono text-primary/60 hover:text-primary uppercase tracking-wider transition-colors flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            send
          </button>
        )}
      </div>
    </div>
  );
};

export default TerminalView;
