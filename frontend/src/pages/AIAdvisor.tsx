import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

const SUGGESTIONS = [
  "Is my business financially healthy right now?",
  "What's my biggest risk this quarter?",
  "How can I improve my profit margin?",
  "What should I focus on next?",
];

export function AIAdvisor() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .getChatHistory()
      .then((res) => setMessages(res.messages))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setError(null);
    setInput("");
    const optimistic: Message = { role: "user", content: text, id: `local-${Date.now()}` };
    setMessages((m) => [...m, optimistic]);
    setSending(true);
    try {
      const res = await api.sendChatMessage(text);
      setMessages((m) => [...m, { role: "assistant", content: res.reply, id: `local-${Date.now()}-r` }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-4rem)]">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-ink dark:text-slate-100">
          <Sparkles size={20} className="text-primary" /> AI Advisor
        </h1>
        <p className="text-sm text-ink-secondary">Ask anything about your business — answers are grounded in your real numbers.</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-card border border-border bg-white p-4 dark:bg-[#0F1729] dark:border-slate-800">
        {loading && <p className="text-sm text-ink-secondary">Loading conversation…</p>}

        {!loading && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Sparkles size={28} className="text-primary" />
            <p className="text-sm text-ink-secondary">Ask your first question, or try one of these:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-ink hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-ink dark:bg-slate-800 dark:text-slate-100"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-ink-secondary dark:bg-slate-800">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your AI business advisor…"
          className="h-11 flex-1 rounded-lg border border-border bg-white px-4 text-sm text-ink placeholder:text-ink-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-[#0F1729] dark:border-slate-700 dark:text-slate-100"
        />
        <Button type="submit" disabled={sending || !input.trim()} aria-label="Send message">
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
