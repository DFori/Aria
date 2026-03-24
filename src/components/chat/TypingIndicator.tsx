"use client";
// src/components/chat/TypingIndicator.tsx
import { Sparkles } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-3 py-2">
      <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
      </div>
      <div className="glass px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400" />
      </div>
    </div>
  );
}
