// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import type { CalendarEvent } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEventTime(event: CalendarEvent): string {
  const start = event.start.dateTime ?? event.start.date;
  const end = event.end.dateTime ?? event.end.date;
  if (!start) return "";

  if (event.start.date && !event.start.dateTime) {
    return "All day";
  }

  const startDate = parseISO(start);
  const endDate = end ? parseISO(end) : null;

  const timeStr = format(startDate, "h:mm a");
  const endStr = endDate ? ` – ${format(endDate, "h:mm a")}` : "";
  return `${timeStr}${endStr}`;
}

export function formatEventDate(event: CalendarEvent): string {
  const start = event.start.dateTime ?? event.start.date;
  if (!start) return "";

  const date = parseISO(start);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE, MMM d");
}

export function getEventColor(event: CalendarEvent): string {
  const colors: Record<string, string> = {
    "1": "#7986CB", // Lavender
    "2": "#33B679", // Sage
    "3": "#8E24AA", // Grape
    "4": "#E67C73", // Flamingo
    "5": "#F6BF26", // Banana
    "6": "#F4511E", // Tangerine
    "7": "#039BE5", // Peacock
    "8": "#616161", // Graphite
    "9": "#3F51B5", // Blueberry
    "10": "#0B8043", // Basil
    "11": "#D50000", // Tomato
  };
  return event.colorId ? (colors[event.colorId] ?? "#8b5cf6") : "#8b5cf6";
}

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}
