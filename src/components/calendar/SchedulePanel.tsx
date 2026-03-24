"use client";
// src/components/calendar/SchedulePanel.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  parseISO,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCw, Clock, MapPin } from "lucide-react";
import { CalendarEvent } from "@/types";
import { formatEventTime, getEventColor, cn } from "@/lib/utils";

type ViewMode = "week" | "day" | "month";

export function SchedulePanel() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?view=${viewMode}`);
      const data = await res.json();
      setEvents(data.data?.events ?? []);
    } catch {
      console.error("Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 0 }),
    end: endOfWeek(currentDate, { weekStartsOn: 0 }),
  });

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const start = event.start.dateTime ?? event.start.date;
      if (!start) return false;
      return isSameDay(parseISO(start), day);
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/60 glass flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Schedule</p>
            <p className="text-xs text-slate-500">
              {format(startOfWeek(currentDate), "MMM d")} –{" "}
              {format(endOfWeek(currentDate), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode */}
          <div className="flex gap-1 glass-light rounded-lg p-1">
            {(["day", "week", "month"] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-all capitalize",
                  viewMode === m
                    ? "bg-violet-600/30 text-violet-300"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-1">
            <button
              onClick={() => {
                const d = new Date(currentDate);
                d.setDate(d.getDate() - 7);
                setCurrentDate(d);
              }}
              className="p-1.5 rounded-lg glass-light text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2 py-1 rounded-lg glass-light text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => {
                const d = new Date(currentDate);
                d.setDate(d.getDate() + 7);
                setCurrentDate(d);
              }}
              className="p-1.5 rounded-lg glass-light text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchEvents}
            className="p-1.5 rounded-lg glass-light text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <ScheduleSkeleton />
        ) : (
          <div className="p-4">
            {/* Week header */}
            <div className="grid grid-cols-7 gap-1 mb-3">
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">
                    {format(day, "EEE")}
                  </p>
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mx-auto",
                      isToday(day)
                        ? "bg-violet-600 text-white"
                        : "text-slate-400"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                </div>
              ))}
            </div>

            {/* Event rows per day */}
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[120px] rounded-xl p-1.5",
                      isToday(day) ? "bg-violet-600/5 ring-1 ring-violet-500/20" : ""
                    )}
                  >
                    {dayEvents.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-[10px] text-slate-700">Free</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {dayEvents.map((event) => (
                          <EventChip key={event.id} event={event} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Today's events detail */}
            <TodayDetail events={getEventsForDay(new Date())} />
          </div>
        )}
      </div>
    </div>
  );
}

function EventChip({ event }: { event: CalendarEvent }) {
  const color = getEventColor(event);
  const time = formatEventTime(event);

  return (
    <div
      className="rounded-md px-1.5 py-1 text-[10px] leading-tight cursor-pointer hover:opacity-90 transition-opacity"
      style={{ backgroundColor: color + "22", borderLeft: `2px solid ${color}` }}
      title={event.summary}
    >
      <p className="font-medium truncate" style={{ color }}>
        {event.summary}
      </p>
      {time !== "All day" && <p className="text-slate-500 truncate">{time}</p>}
    </div>
  );
}

function TodayDetail({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-violet-400" />
        Today's Events
      </h3>
      <div className="space-y-2">
        {events.map((event) => {
          const color = getEventColor(event);
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass rounded-xl p-3 flex gap-3"
            >
              <div
                className="w-1 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{event.summary}</p>
                <p className="text-xs text-slate-500">{formatEventTime(event)}</p>
                {event.location && (
                  <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    {event.location}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl shimmer" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl shimmer" />
      ))}
    </div>
  );
}
