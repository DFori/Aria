"use client";
// src/components/chat/ConfirmationCard.tsx
import { motion } from "framer-motion";
import { AlertTriangle, Check, X, Mail, Trash2, CalendarPlus } from "lucide-react";
import { ConfirmationPayload } from "@/types";

interface ConfirmationCardProps {
  confirmation: ConfirmationPayload;
  onConfirm: () => void;
  onCancel: () => void;
}

const TYPE_CONFIG = {
  EMAIL: { icon: Mail, color: "blue", label: "Send Email?" },
  DELETE: { icon: Trash2, color: "red", label: "Delete Event?" },
  EVENT: { icon: CalendarPlus, color: "violet", label: "Create Event?" },
  EVENT_CREATE: { icon: CalendarPlus, color: "violet", label: "Create Event?" },
  EVENT_UPDATE: { icon: CalendarPlus, color: "violet", label: "Update Event?" },
  TASK_CREATE: { icon: Check, color: "emerald", label: "Create Task?" },
};

export function ConfirmationCard({ confirmation, onConfirm, onCancel }: ConfirmationCardProps) {
  const config =
    TYPE_CONFIG[confirmation.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.EVENT;
  const Icon = config.icon;

  const colorClasses = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
    violet: "bg-violet-500/10 border-violet-500/20 text-violet-400",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  };

  const btnColors = {
    blue: "bg-blue-600 hover:bg-blue-500",
    red: "bg-red-600 hover:bg-red-500",
    violet: "bg-violet-600 hover:bg-violet-500",
    emerald: "bg-emerald-600 hover:bg-emerald-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="glass rounded-xl border border-slate-700/60 overflow-hidden max-w-md"
    >
      {/* Header */}
      <div
        className={`flex items-center gap-2.5 px-4 py-3 border-b border-slate-700/40 ${colorClasses[config.color as keyof typeof colorClasses]}`}
      >
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-semibold">Confirmation Required</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center ${colorClasses[config.color as keyof typeof colorClasses]}`}
          >
            <Icon className="w-3.5 h-3.5" />
          </div>
          <p className="text-sm font-semibold text-slate-200">{config.label}</p>
        </div>

        <p className="text-sm text-slate-400 mb-3">{confirmation.description}</p>

        {/* Details */}
        <div className="space-y-1.5 mb-4">
          {Object.entries(confirmation.details).map(([key, value]) => (
            <div key={key} className="flex gap-2 text-xs">
              <span className="text-slate-500 w-16 flex-shrink-0">{key}</span>
              <span className="text-slate-300 break-all">{value}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-semibold transition-colors ${btnColors[config.color as keyof typeof btnColors]}`}
          >
            <Check className="w-3.5 h-3.5" />
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors border border-slate-700"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}
