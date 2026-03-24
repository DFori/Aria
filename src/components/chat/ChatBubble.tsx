"use client";
// src/components/chat/ChatBubble.tsx
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { Sparkles, User, ChevronDown, ChevronUp, Wrench } from "lucide-react";
import { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ChatBubbleProps {
  message: ChatMessage;
  user: { name: string; email: string; image?: string };
}

const TOOL_LABELS: Record<string, string> = {
  check_availability: "Checking availability",
  get_events: "Fetching calendar events",
  create_event: "Creating event",
  update_event: "Updating event",
  delete_event: "Deleting event",
  send_email: "Sending email",
  create_task: "Creating task",
  get_tasks: "Fetching tasks",
};

export function ChatBubble({ message, user }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const [showTools, setShowTools] = useState(false);

  return (
    <div className={cn("flex gap-3 py-2", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {isUser ? (
          <div className="w-7 h-7 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt={user.name} className="w-7 h-7 rounded-full" />
            ) : (
              <User className="w-3.5 h-3.5 text-violet-300" />
            )}
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn("flex flex-col max-w-[75%]", isUser ? "items-end" : "items-start")}>
        {/* Tool calls indicator */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <button
            onClick={() => setShowTools((p) => !p)}
            className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-400 mb-1.5 transition-colors"
          >
            <Wrench className="w-2.5 h-2.5" />
            <span>
              Used {message.toolCalls.length} tool{message.toolCalls.length > 1 ? "s" : ""}
            </span>
            {showTools ? (
              <ChevronUp className="w-2.5 h-2.5" />
            ) : (
              <ChevronDown className="w-2.5 h-2.5" />
            )}
          </button>
        )}

        {/* Tool details */}
        {showTools && message.toolCalls && (
          <div className="mb-2 space-y-1 w-full">
            {message.toolCalls.map((tc, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{TOOL_LABELS[tc.tool] ?? tc.tool}</span>
              </div>
            ))}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm",
            isUser
              ? "bg-violet-600 text-white rounded-tr-sm"
              : "glass text-slate-200 rounded-tl-sm"
          )}
        >
          {isUser ? (
            <p className="leading-relaxed">{message.content}</p>
          ) : (
            <div className="chat-prose">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-[10px] text-slate-600 mt-1 px-1">
          {format(message.timestamp, "h:mm a")}
        </p>
      </div>
    </div>
  );
}
