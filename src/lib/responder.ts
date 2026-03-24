// src/lib/responder.ts
// Converts structured data from Google APIs into natural, human-friendly text.

import { format, isToday, isTomorrow, isYesterday, differenceInMinutes } from "date-fns";

export interface CalendarEventRaw {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>;
  htmlLink?: string;
}

export interface TaskRaw {
  id: string;
  title?: string;
  notes?: string;
  due?: string;
  status?: string;
}

// ─── Schedule / events ────────────────────────────────────────────────────────

function formatEventTime(event: CalendarEventRaw): string {
  const start = event.start?.dateTime ?? event.start?.date;
  const end = event.end?.dateTime ?? event.end?.date;
  if (!start) return "All day";

  if (!event.start?.dateTime) return "All day";

  const s = new Date(start);
  const e = end ? new Date(end) : null;

  const dur = e ? differenceInMinutes(e, s) : null;
  const durStr = dur
    ? dur >= 60
      ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? ` ${dur % 60}m` : ""}`
      : `${dur}m`
    : "";

  return `${format(s, "h:mm a")}${e ? ` – ${format(e, "h:mm a")}` : ""}${durStr ? ` (${durStr})` : ""}`;
}

function friendlyDate(d: Date): string {
  if (isToday(d)) return "today";
  if (isTomorrow(d)) return "tomorrow";
  if (isYesterday(d)) return "yesterday";
  return format(d, "EEEE, MMM d");
}

export function buildScheduleResponse(
  events: CalendarEventRaw[],
  rangeStart: Date,
  rangeEnd: Date,
  view: string
): string {
  const rangeLabel =
    view === "today"
      ? "today"
      : view === "tomorrow"
      ? "tomorrow"
      : view === "week"
      ? `this week (${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d")})`
      : `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`;

  if (events.length === 0) {
    const emojis = ["📭", "🎉", "✨", "😌"];
    const e = emojis[Math.floor(Math.random() * emojis.length)];
    return `${e} You have **no events** scheduled ${rangeLabel}. Your calendar is clear!`;
  }

  // Group by date
  const byDate: Record<string, CalendarEventRaw[]> = {};
  for (const ev of events) {
    const dt = ev.start?.dateTime ?? ev.start?.date;
    if (!dt) continue;
    const key = format(new Date(dt), "yyyy-MM-dd");
    byDate[key] = [...(byDate[key] ?? []), ev];
  }

  const lines: string[] = [`📅 **Your schedule ${rangeLabel}:**\n`];

  for (const [dateKey, dayEvents] of Object.entries(byDate).sort()) {
    const d = new Date(dateKey + "T00:00:00");
    const dayLabel =
      isToday(d)
        ? "**Today**"
        : isTomorrow(d)
        ? "**Tomorrow**"
        : `**${format(d, "EEEE, MMM d")}**`;

    lines.push(`${dayLabel}`);
    for (const ev of dayEvents) {
      const time = formatEventTime(ev);
      const title = ev.summary ?? "Untitled Event";
      const loc = ev.location ? ` · 📍 ${ev.location}` : "";
      const att =
        ev.attendees && ev.attendees.length > 1
          ? ` · 👥 ${ev.attendees.length} attendees`
          : "";
      lines.push(`• ${title} · ${time}${loc}${att}`);
    }
    lines.push("");
  }

  const count = events.length;
  lines.push(`_${count} event${count !== 1 ? "s" : ""} total._`);

  return lines.join("\n");
}

// ─── Availability ─────────────────────────────────────────────────────────────

export function buildAvailabilityResponse(
  isFree: boolean,
  requestedTime: Date,
  durationMinutes: number,
  busySlots: Array<{ start?: string; end?: string }>
): string {
  const timeStr = format(requestedTime, "h:mm a");
  const dateStr = friendlyDate(requestedTime);
  const endTime = new Date(requestedTime.getTime() + durationMinutes * 60000);

  if (isFree) {
    return `✅ You're **free** on ${dateStr} at ${timeStr} (until ${format(endTime, "h:mm a")}). Go ahead and schedule something!`;
  }

  // Show what's blocking
  const conflicts = busySlots
    .map((s) => {
      if (!s.start) return null;
      const st = new Date(s.start);
      const en = s.end ? new Date(s.end) : null;
      return `${format(st, "h:mm a")}${en ? ` – ${format(en, "h:mm a")}` : ""}`;
    })
    .filter(Boolean);

  const lines = [
    `❌ You're **busy** on ${dateStr} at ${timeStr}.`,
    "",
    `**Conflicts:**`,
    ...conflicts.map((c) => `• ${c}`),
    "",
    `**Suggestions:** Try ${suggestAlternatives(requestedTime, durationMinutes)
      .map((t) => format(t, "h:mm a"))
      .join(", ")} instead.`,
  ];

  return lines.join("\n");
}

function suggestAlternatives(base: Date, durationMinutes: number): Date[] {
  const suggestions: Date[] = [];
  const offsets = [60, 120, -60]; // +1h, +2h, -1h from requested
  for (const offset of offsets) {
    const candidate = new Date(base.getTime() + offset * 60000);
    // Keep business hours 8am-7pm
    if (candidate.getHours() >= 8 && candidate.getHours() < 19) {
      suggestions.push(candidate);
    }
  }
  return suggestions.slice(0, 3);
}

// ─── Event created ────────────────────────────────────────────────────────────

export function buildEventCreatedResponse(
  event: CalendarEventRaw,
  wasConflict: boolean
): string {
  const title = event.summary ?? "Untitled Event";
  const start = event.start?.dateTime ? new Date(event.start.dateTime) : null;
  const end = event.end?.dateTime ? new Date(event.end.dateTime) : null;
  const loc = event.location ? `\n📍 **Location:** ${event.location}` : "";
  const att =
    event.attendees && event.attendees.length > 0
      ? `\n👥 **Attendees:** ${event.attendees.map((a) => a.displayName ?? a.email).join(", ")}`
      : "";

  const lines = [
    `✅ **Event created!**`,
    ``,
    `📌 **${title}**`,
    start ? `🕐 **When:** ${friendlyDate(start)}, ${format(start, "h:mm a")}${end ? ` – ${format(end, "h:mm a")}` : ""}` : "",
    loc,
    att,
  ].filter((l) => l !== "");

  if (wasConflict) {
    lines.push("", "⚠️ _Note: There was already something at this time, but I've created the event anyway._");
  }

  return lines.join("\n");
}

// ─── Event deleted ────────────────────────────────────────────────────────────

export function buildEventDeletedResponse(title: string): string {
  return `🗑️ **"${title}"** has been removed from your calendar.`;
}

export function buildEventNotFoundResponse(query: string): string {
  return `❓ I couldn't find an event matching **"${query}"**. Try showing your schedule first to find the exact event name.`;
}

// ─── Email ────────────────────────────────────────────────────────────────────

export function buildEmailSentResponse(to: string, subject: string, isSelf: boolean): string {
  if (isSelf) {
    return `📧 **Email sent to yourself!**\n\n**Subject:** ${subject}\n\nCheck your inbox shortly.`;
  }
  return `📧 **Email sent to ${to}**\n\n**Subject:** ${subject}\n\nMessage delivered!`;
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export function buildTaskCreatedResponse(title: string, due?: Date): string {
  const dueStr = due ? `\n📅 **Due:** ${friendlyDate(due)}${due.getHours() !== 0 ? `, ${format(due, "h:mm a")}` : ""}` : "";
  return `✅ **Reminder set!**\n\n📝 ${title}${dueStr}`;
}

export function buildTasksListResponse(tasks: TaskRaw[]): string {
  if (tasks.length === 0) {
    return `✨ **No pending tasks!** Your to-do list is clear.`;
  }
  const lines = [`📋 **Your pending tasks (${tasks.length}):**\n`];
  for (const t of tasks) {
    const due = t.due ? ` · 📅 ${format(new Date(t.due), "MMM d")}` : "";
    lines.push(`• **${t.title ?? "Untitled"}**${due}`);
    if (t.notes) lines.push(`  _${t.notes}_`);
  }
  return lines.join("\n");
}

// ─── Help ─────────────────────────────────────────────────────────────────────

export function buildHelpResponse(): string {
  return `👋 **Hi! Here's what I can do:**

**📅 View your schedule**
• "Show me today's schedule"
• "What's on this week?"
• "What do I have tomorrow?"
• "Show me my calendar for next week"

**⏰ Check availability**
• "Am I free tomorrow at 2pm?"
• "Do I have anything on Friday at 10am?"
• "Am I available this afternoon?"

**📌 Create events & meetings**
• "Schedule a meeting tomorrow at 3pm"
• "Create a call with john@example.com on Friday at 2pm"
• "Book a 1:1 with sarah@company.com at 10am next Monday"
• "Set up a standup for tomorrow at 9am"

**📧 Send emails**
• "Email me my schedule for tomorrow"
• "Send an email to john@example.com saying I'll be 10 minutes late"
• "Email sarah@company.com that the meeting is confirmed"

**✅ Tasks & reminders**
• "Remind me to prepare the slides tomorrow at 9am"
• "Add a task: review Q4 report"
• "Show my tasks"

_Just type naturally — I'll figure out what you mean!_`;
}

// ─── Errors & clarifications ──────────────────────────────────────────────────

export function buildNeedMoreInfoResponse(type: string, missing: string[]): string {
  const prompts: Record<string, string> = {
    dateTime: "When should this be? (e.g. _tomorrow at 3pm_, _Friday at 10am_)",
    emailTo: "Who should I send it to? (include an email address, e.g. _john@example.com_)",
    emailMessage: "What should the email say?",
    taskTitle: "What should I remind you about?",
    title: "What should I call this event?",
  };

  const questions = missing.map((m) => `• ${prompts[m] ?? m}`).join("\n");

  const intros: Record<string, string> = {
    create_event: "I'd love to schedule that for you!",
    send_email: "I can send that email!",
    create_task: "I'll set that reminder up!",
    check_availability: "I'll check your calendar!",
    delete_event: "I'll remove that event!",
  };

  return `${intros[type] ?? "Almost there!"} Just need a bit more info:\n\n${questions}`;
}

export function buildUnknownResponse(): string {
  const responses = [
    `🤔 I'm not sure what you mean. Try typing **"help"** to see what I can do!`,
    `🤷 I didn't quite get that. Type **"help"** to see a list of things I can help with.`,
    `❓ I couldn't figure that one out. Try rephrasing, or type **"help"** to see examples.`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

export function buildErrorResponse(action: string): string {
  return `⚠️ Something went wrong while trying to ${action}. Please try again in a moment.`;
}
