"use client";
// src/components/chat/ChatInput.tsx
import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { Send, Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (msg: string) => void;
  disabled?: boolean;
}

const SUGGESTION_GROUPS = [
  {
    label: "📅 Schedule",
    items: [
      "Show me today's schedule",
      "What's on this week?",
      "What do I have tomorrow?",
    ],
  },
  {
    label: "⏰ Availability",
    items: [
      "Am I free tomorrow at 2pm?",
      "Am I available Friday at 10am?",
      "Do I have anything Monday morning?",
    ],
  },
  {
    label: "📌 Create Events",
    items: [
      "Schedule a meeting tomorrow at 3pm",
      "Book a call with john@example.com on Friday at 2pm",
      "Set up a standup for tomorrow at 9am for 30 minutes",
    ],
  },
  {
    label: "📧 Email",
    items: [
      "Email me my schedule for today",
      "Send an email to john@example.com saying I'll be 10 minutes late",
    ],
  },
  {
    label: "✅ Reminders",
    items: [
      "Remind me to prepare slides tomorrow at 9am",
      "Add a task: review the Q4 report",
      "Show my tasks",
    ],
  },
];

const ALL_SUGGESTIONS = SUGGESTION_GROUPS.flatMap((g) => g.items);

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions as user types
  useEffect(() => {
    if (value.length > 1) {
      const q = value.toLowerCase();
      const matches = ALL_SUGGESTIONS.filter((s) => s.toLowerCase().includes(q)).slice(0, 5);
      setFiltered(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setFiltered([]);
      setShowSuggestions(false);
    }
  }, [value]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    setShowSuggestions(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") setShowSuggestions(false);
  };

  const handleInput = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  };

  const pickSuggestion = (s: string) => {
    setValue(s);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Autocomplete dropdown */}
      {showSuggestions && (
        <div className="absolute bottom-full mb-2 left-0 right-0 glass rounded-xl overflow-hidden border border-slate-700/60 shadow-xl z-10">
          {filtered.map((s) => (
            <button
              key={s}
              onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s); }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-violet-600/15 hover:text-violet-200 transition-colors border-b border-slate-800/50 last:border-0"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Quick suggestion pills (when empty) */}
      {!value && !disabled && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {[
            "Show today's schedule",
            "Am I free tomorrow at 2pm?",
            "Schedule a meeting",
            "Email me my agenda",
            "Show my tasks",
          ].map((s) => (
            <button
              key={s}
              onClick={() => { setValue(s); textareaRef.current?.focus(); }}
              className="text-xs px-2.5 py-1.5 rounded-lg glass-light text-slate-500 hover:text-violet-300 hover:border-violet-500/30 border border-transparent transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div
        className={cn(
          "glass rounded-2xl flex items-end gap-2 p-2 transition-all duration-200",
          !disabled && "focus-within:border-violet-500/30"
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? "Aria is thinking…" : "Ask me about your calendar…"}
          rows={1}
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 resize-none outline-none leading-relaxed py-2 min-h-[36px] max-h-[120px]"
        />

        {value && (
          <button
            onClick={() => { setValue(""); setShowSuggestions(false); }}
            className="p-1.5 text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0 mb-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className={cn(
            "p-2 rounded-xl transition-all duration-200 flex-shrink-0 mb-0.5",
            value.trim() && !disabled
              ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20"
              : "text-slate-600 cursor-not-allowed"
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[10px] text-slate-700 text-center mt-1.5">
        Type <span className="text-slate-600">help</span> to see all supported commands
      </p>
    </div>
  );
}
