"use client";
// src/components/calendar/TasksPanel.tsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { CheckSquare, RefreshCw, Plus, Clock, Square } from "lucide-react";
import { Task } from "@/types";
import { cn } from "@/lib/utils";

export function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(data.data?.tasks ?? []);
    } catch {
      console.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = () => {
    // Dispatch to chat panel
    window.dispatchEvent(
      new CustomEvent("aria:prompt", { detail: "Create a new task" })
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/60 glass flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Tasks & Reminders</p>
            <p className="text-xs text-slate-500">
              {tasks.length} pending task{tasks.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCreateTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-600/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Task
          </button>
          <button
            onClick={fetchTasks}
            className="p-1.5 rounded-lg glass-light text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <TasksSkeleton />
        ) : tasks.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {tasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <TaskCard task={task} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const isOverdue =
    task.due && new Date(task.due) < new Date() && task.status !== "completed";

  return (
    <div
      className={cn(
        "glass rounded-xl p-4 flex gap-3 group transition-all hover:border-slate-700/80",
        task.status === "completed" && "opacity-50"
      )}
    >
      <div className="mt-0.5 flex-shrink-0">
        {task.status === "completed" ? (
          <CheckSquare className="w-4 h-4 text-emerald-400" />
        ) : (
          <Square className="w-4 h-4 text-slate-600" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            task.status === "completed"
              ? "line-through text-slate-500"
              : "text-slate-200"
          )}
        >
          {task.title}
        </p>

        {task.notes && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
            {task.notes}
          </p>
        )}

        {task.due && (
          <div
            className={cn(
              "flex items-center gap-1 mt-1.5 text-xs",
              isOverdue ? "text-red-400" : "text-slate-500"
            )}
          >
            <Clock className="w-3 h-3" />
            <span>
              {isOverdue ? "Overdue · " : "Due "}
              {format(parseISO(task.due), "MMM d, h:mm a")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
        <CheckSquare className="w-6 h-6 text-emerald-400" />
      </div>
      <p className="text-sm font-medium text-slate-400 mb-1">All caught up!</p>
      <p className="text-xs text-slate-600 max-w-xs">
        No pending tasks. Ask Aria to create a reminder or task for you.
      </p>
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl shimmer" />
      ))}
    </div>
  );
}
