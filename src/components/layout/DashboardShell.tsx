"use client";
// src/components/layout/DashboardShell.tsx
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { SchedulePanel } from "@/components/calendar/SchedulePanel";
import { TasksPanel } from "@/components/calendar/TasksPanel";

type View = "chat" | "schedule" | "tasks";

interface DashboardShellProps {
  user: { name: string; email: string; image?: string };
}

export function DashboardShell({ user }: DashboardShellProps) {
  const [view, setView] = useState<View>("chat");

  return (
    <div className="flex h-screen overflow-hidden mesh-bg">
      <Sidebar user={user} activeView={view} onViewChange={setView} />
      <main className="flex-1 overflow-hidden flex flex-col">
        {view === "chat" && <ChatPanel user={user} />}
        {view === "schedule" && <SchedulePanel />}
        {view === "tasks" && <TasksPanel />}
      </main>
    </div>
  );
}
