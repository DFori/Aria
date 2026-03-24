"use client";
// src/components/layout/Sidebar.tsx
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  CalendarDays,
  CheckSquare,
  LogOut,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type View = "chat" | "schedule" | "tasks";

const navItems = [
  { id: "chat" as View, label: "Chat with Aria", icon: MessageSquare },
  { id: "schedule" as View, label: "Schedule", icon: CalendarDays },
  { id: "tasks" as View, label: "Tasks", icon: CheckSquare },
];

const quickPrompts = [
  "Show me today's schedule",
  "Am I free this afternoon?",
  "What's on this week?",
  "Create a task",
];

interface SidebarProps {
  user: { name: string; email: string; image?: string };
  activeView: View;
  onViewChange: (v: View) => void;
}

export function Sidebar({ user, activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-60 flex-shrink-0 glass border-r border-slate-800/60 flex flex-col py-4">
      {/* Logo */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-100 tracking-tight">Aria</p>
            <p className="text-[10px] text-slate-500 leading-none">AI Calendar Agent</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-2 mb-6">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 px-2 mb-2">
          Navigation
        </p>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 mb-0.5 group",
              activeView === id
                ? "bg-violet-600/20 text-violet-300 border border-violet-500/20"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{label}</span>
            {activeView === id && (
              <motion.div
                layoutId="activeNav"
                className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400"
              />
            )}
          </button>
        ))}
      </nav>

      {/* Quick Prompts */}
      <div className="px-2 mb-6">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 px-2 mb-2">
          Quick Actions
        </p>
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => {
              onViewChange("chat");
              // Dispatch a custom event to pre-fill chat
              window.dispatchEvent(new CustomEvent("aria:prompt", { detail: prompt }));
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all duration-150 mb-0.5 text-left group"
          >
            <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-50 group-hover:opacity-100" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Connected Account */}
      <div className="px-3 mb-3">
        <div className="glass-light rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-medium">
              Connected
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name}
                className="w-7 h-7 rounded-full ring-1 ring-violet-500/30"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-violet-600/30 flex items-center justify-center">
                <span className="text-xs text-violet-300 font-semibold">
                  {user.name?.[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs text-slate-300 font-medium truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-1 mt-2">
            {["Calendar", "Gmail", "Tasks"].map((s) => (
              <span
                key={s}
                className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div className="px-2">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
