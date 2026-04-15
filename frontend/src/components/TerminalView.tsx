import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import { useOrchestratorChat } from "@/hooks/useOrchestratorChat";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";

interface TerminalViewProps {
  compact?: boolean;
}

const TerminalView = ({ compact = false }: TerminalViewProps) => {
  const { messages, sendMessage, isStreaming, cancelStream, clearHistory } =
    useOrchestratorChat();
  const orchestratorStatus = useAppStore((s) => s.orchestratorStatus);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Auto-scroll on new content ────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput("");
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/50 rounded-lg border border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              orchestratorStatus === 'online' ? 'bg-green-500' :
              orchestratorStatus === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-sm font-mono text-primary">
              NEXUS ORCHESTRATOR {orchestratorStatus.toUpperCase()}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="text-xs"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p className="mb-4">Welcome to NEXUS AI Terminal</p>
              <p className="text-sm">Ask questions about DeFi, trading strategies, or system status.</p>
            </div>
          )}
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    code: ({ inline, children }) => 
                      inline ? (
                        <code className="bg-black/20 px-1 py-0.5 rounded text-sm">{children}</code>
                      ) : (
                        <pre className="bg-black/20 p-2 rounded text-sm overflow-x-auto">
                          <code>{children}</code>
                        </pre>
                      ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {message.role === 'assistant' && isStreaming && index === messages.length - 1 && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.7 }}
                    className="inline-block ml-1"
                  >
                    ▊
                  </motion.span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-primary/20">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask the NEXUS AI..."
            disabled={isStreaming}
            className="flex-1 bg-background"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
          {isStreaming && (
            <Button
              onClick={cancelStream}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TerminalView;
