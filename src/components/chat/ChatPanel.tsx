"use client";
// src/components/chat/ChatPanel.tsx
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/hooks/useChat";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { ConfirmationCard } from "./ConfirmationCard";
import { TypingIndicator } from "./TypingIndicator";
import { CalendarDays, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface ChatPanelProps {
  user: { name: string; email: string; image?: string };
}

export function ChatPanel({ user }: ChatPanelProps) {
  const {
    messages,
    isLoading,
    pendingConfirmation,
    sendMessage,
    confirmAction,
    cancelAction,
  } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Listen for quick prompt events from sidebar
  useEffect(() => {
    const handler = (e: Event) => {
      const prompt = (e as CustomEvent).detail as string;
      sendMessage(prompt);
    };
    window.addEventListener("aria:prompt", handler);
    return () => window.removeEventListener("aria:prompt", handler);
  }, [sendMessage]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/60 flex items-center justify-between glass">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Aria</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs text-slate-500">
                AI Calendar Assistant · Active
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{format(new Date(), "EEEE, MMMM d")}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-1">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {msg.pending ? (
                <TypingIndicator />
              ) : (
                <>
                  <ChatBubble message={msg} user={user} />
                  {msg.confirmationRequired && pendingConfirmation && (
                    <div className="mt-3 ml-10">
                      <ConfirmationCard
                        confirmation={pendingConfirmation}
                        onConfirm={() => confirmAction()}
                        onCancel={cancelAction}
                      />
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 pb-5 pt-3">
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
