// src/lib/parser.ts
// Rule-based intent parser — no LLM required.
// Understands natural language patterns and extracts structured data.

export type IntentType =
  | "check_availability"
  | "get_schedule"
  | "create_event"
  | "delete_event"
  | "send_email"
  | "create_task"
  | "get_tasks"
  | "help"
  | "unknown";

export interface ParsedIntent {
  type: IntentType;
  // time-related
  dateTime?: Date;
  endDateTime?: Date;
  durationMinutes?: number;
  rangeStart?: Date;
  rangeEnd?: Date;
  // event
  title?: string;
  location?: string;
  attendees?: string[];
  // email
  emailTo?: string;
  emailMessage?: string;
  // task
  taskTitle?: string;
  taskDue?: Date;
  taskNotes?: string;
  // schedule view
  scheduleView?: "today" | "tomorrow" | "week" | "month" | "custom";
  // raw input for fallback
  raw: string;
  confidence: number; // 0-1
}

// ─── Date/time helpers ───────────────────────────────────────────────────────

export function resolveDate(ref: string, now: Date): Date | null {
  const lower = ref.toLowerCase().trim();
  const d = new Date(now);

  if (lower === "today" || lower === "tonight") {
    return startOfDay(d);
  }
  if (lower === "tomorrow") {
    d.setDate(d.getDate() + 1);
    return startOfDay(d);
  }
  if (lower === "yesterday") {
    d.setDate(d.getDate() - 1);
    return startOfDay(d);
  }
  if (lower === "next week") {
    d.setDate(d.getDate() + (7 - d.getDay() + 1));
    return startOfDay(d);
  }
  if (lower === "this week" || lower === "the week") {
    // Monday of this week
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return startOfDay(d);
  }

  // "this monday", "next friday", etc.
  const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const nextMatch = lower.match(/^(this |next )?(\w+day)$/);
  if (nextMatch) {
    const targetDay = dayNames.indexOf(nextMatch[2]);
    if (targetDay !== -1) {
      const today = d.getDay();
      let diff = targetDay - today;
      if (diff <= 0 || nextMatch[1] === "next ") diff += 7;
      d.setDate(d.getDate() + diff);
      return startOfDay(d);
    }
  }

  // "in N days/hours"
  const inMatch = lower.match(/^in (\d+) (day|days|hour|hours|week|weeks)$/);
  if (inMatch) {
    const n = parseInt(inMatch[1]);
    const unit = inMatch[2];
    if (unit.startsWith("day")) d.setDate(d.getDate() + n);
    else if (unit.startsWith("hour")) d.setHours(d.getHours() + n);
    else if (unit.startsWith("week")) d.setDate(d.getDate() + n * 7);
    return d;
  }

  // Try native Date parse as last resort
  const parsed = new Date(ref);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}

export function resolveTime(timeStr: string, baseDate: Date): Date | null {
  // Matches: "2pm", "2:30pm", "14:00", "2 pm", "noon", "midnight"
  const d = new Date(baseDate);

  if (timeStr.toLowerCase() === "noon") {
    d.setHours(12, 0, 0, 0);
    return d;
  }
  if (timeStr.toLowerCase() === "midnight") {
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2] ?? "0");
  const meridiem = match[3]?.toLowerCase();

  if (meridiem === "pm" && hours !== 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;

  d.setHours(hours, minutes, 0, 0);
  return d;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function endOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

function startOfWeek(d: Date): Date {
  const c = new Date(d);
  c.setDate(c.getDate() - c.getDay());
  c.setHours(0, 0, 0, 0);
  return c;
}

function endOfWeek(d: Date): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + (6 - c.getDay()));
  c.setHours(23, 59, 59, 999);
  return c;
}

// ─── Extraction helpers ───────────────────────────────────────────────────────

/** Extract all email addresses from a string */
export function extractEmails(text: string): string[] {
  return [...text.matchAll(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)].map(
    (m) => m[0]
  );
}

/** Extract a duration like "1 hour", "30 minutes", "2 hrs", "90 min" */
function extractDuration(text: string): number | null {
  const match = text.match(/(\d+)\s*(hour|hr|hrs|h|minute|min|mins|m)\b/i);
  if (!match) return null;
  const n = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("h")) return n * 60;
  return n;
}

/** Try to pull a datetime from text like "tomorrow at 3pm", "friday at 10:30am" */
function extractDateTime(text: string, now: Date): Date | null {
  // Pattern: <date ref> at <time>
  const atMatch = text.match(
    /\b(today|tonight|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next \w+|this \w+|in \d+ \w+)\b.*?\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight)/i
  );
  if (atMatch) {
    const base = resolveDate(atMatch[1], now);
    if (base) {
      const t = resolveTime(atMatch[2], base);
      if (t) return t;
    }
  }

  // Pattern: just a time (assume today or nearest future)
  const timeOnly = text.match(/\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight)\b/i);
  if (timeOnly) {
    const t = resolveTime(timeOnly[1], now);
    if (t) {
      // If time has already passed today, assume tomorrow
      if (t < now) t.setDate(t.getDate() + 1);
      return t;
    }
  }

  // Plain date ref with no time
  const dateOnly = text.match(
    /\b(today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next \w+|this \w+)\b/i
  );
  if (dateOnly) {
    return resolveDate(dateOnly[1], now);
  }

  return null;
}

/** Pull a meeting title from phrases like "called X", "titled X", "named X", or quoted strings */
function extractTitle(text: string): string | null {
  // Quoted
  const quoted = text.match(/["']([^"']+)["']/);
  if (quoted) return quoted[1];

  // "called X", "titled X", "named X", "for X"
  const labeled = text.match(/(?:called|titled|named|for a|for an|for the)\s+([A-Z][^,.!?]+)/i);
  if (labeled) return labeled[1].trim();

  return null;
}

/** Extract "send to <email/name>" style recipient */
function extractEmailRecipient(text: string): string | null {
  const emails = extractEmails(text);
  if (emails.length > 0) return emails[0];
  return null;
}

/** Extract the message body after "saying", "that says", "message:", etc. */
function extractEmailBody(text: string): string | null {
  const patterns = [
    /(?:saying|that says|message[:\s]+|tell them|with the message)[:\s]+"?([^"]+)"?$/i,
    /(?:saying|that says|message[:\s]+|tell them)[:\s]+(.+)$/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

// ─── Main intent classifier ───────────────────────────────────────────────────

export function parseIntent(raw: string, now: Date = new Date()): ParsedIntent {
  const text = raw.trim();
  const lower = text.toLowerCase();

  // ── HELP ──
  if (/^(help|what can you do|commands|how does this work|\?+)/.test(lower)) {
    return { type: "help", raw, confidence: 1 };
  }

  // ── CHECK AVAILABILITY ──
  const availabilityTriggers = [
    /\bam i (free|available|busy)\b/i,
    /\bdo i have (anything|something|a meeting|an event)\b/i,
    /\bare? i (free|available|busy)\b/i,
    /\bcheck (if i'm|my) (free|available|busy)\b/i,
    /\bfree (at|on|tomorrow|today)\b/i,
    /\bavailable (at|on|tomorrow|today)\b/i,
    /\bbusy (at|on|tomorrow|today)\b/i,
    /\bany (conflicts|clashes)\b/i,
  ];
  if (availabilityTriggers.some((r) => r.test(lower))) {
    const dateTime = extractDateTime(lower, now);
    const duration = extractDuration(lower) ?? 60;
    return {
      type: "check_availability",
      dateTime: dateTime ?? undefined,
      durationMinutes: duration,
      raw,
      confidence: dateTime ? 0.95 : 0.7,
    };
  }

  // ── GET SCHEDULE / SHOW CALENDAR ──
  const scheduleTriggers = [
    /\bshow (me )?(my )?(schedule|calendar|agenda|events|meetings)\b/i,
    /\bwhat('s| is| do i have) (on|happening|planned|scheduled)\b/i,
    /\bmy (schedule|calendar|agenda|events|meetings)\b/i,
    /\bwhat('s| is) (today|tomorrow|this week|next week|on my)\b/i,
    /\b(today'?s?|tomorrow'?s?|this week'?s?|weekly) (schedule|agenda|events|meetings|calendar)\b/i,
    /\bwhat (do i have|have i got)\b/i,
  ];
  if (scheduleTriggers.some((r) => r.test(lower))) {
    let scheduleView: ParsedIntent["scheduleView"] = "today";
    let rangeStart = startOfDay(now);
    let rangeEnd = endOfDay(now);

    if (/\bthis week\b|\bweek\b/i.test(lower)) {
      scheduleView = "week";
      rangeStart = startOfWeek(now);
      rangeEnd = endOfWeek(now);
    } else if (/\bnext week\b/i.test(lower)) {
      scheduleView = "week";
      const next = new Date(now);
      next.setDate(now.getDate() + 7);
      rangeStart = startOfWeek(next);
      rangeEnd = endOfWeek(next);
    } else if (/\btomorrow\b/i.test(lower)) {
      scheduleView = "tomorrow";
      const tom = new Date(now);
      tom.setDate(now.getDate() + 1);
      rangeStart = startOfDay(tom);
      rangeEnd = endOfDay(tom);
    } else if (/\bmonth\b/i.test(lower)) {
      scheduleView = "month";
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    return {
      type: "get_schedule",
      scheduleView,
      rangeStart,
      rangeEnd,
      raw,
      confidence: 0.9,
    };
  }

  // ── SEND EMAIL ──
  const emailTriggers = [
    /\b(send|write|compose|draft) (an? )?email\b/i,
    /\bemail (me|them|him|her|[a-z]+@)\b/i,
    /\bsend a (message|mail)\b/i,
    /\bmail (me|them|[a-z]+@)\b/i,
  ];
  if (emailTriggers.some((r) => r.test(lower))) {
    const emailTo = extractEmailRecipient(text);
    const emailMessage = extractEmailBody(text);

    // Detect self-email
    const isSelfEmail = /\bemail me\b|\bsend me\b|\bmail me\b/i.test(lower);

    return {
      type: "send_email",
      emailTo: isSelfEmail ? "__self__" : (emailTo ?? undefined),
      emailMessage: emailMessage ?? undefined,
      raw,
      confidence: 0.9,
    };
  }

  // ── CREATE EVENT / SCHEDULE MEETING ──
  const eventTriggers = [
    /\b(schedule|create|add|set up|book|arrange|organise|organize) (a |an )?(meeting|event|appointment|call|sync|standup|stand-up|session|interview)\b/i,
    /\b(schedule|create|add|set up|book) (me )?(a |an )?\b/i,
    /\bput (a |an )?(meeting|event|appointment|call) (on|in) (my )?calendar\b/i,
    /\bnew (meeting|event|appointment|call)\b/i,
    /\bblock (off|out) (my )?(calendar|time|schedule)\b/i,
    /\bremind me to\b(?!.*task)/i,
  ];
  if (eventTriggers.some((r) => r.test(lower))) {
    const dateTime = extractDateTime(lower, now);
    const duration = extractDuration(lower) ?? 60;
    const endDT = dateTime ? new Date(dateTime.getTime() + duration * 60000) : undefined;
    const title = extractTitle(text) ?? guessEventTitle(lower);
    const attendees = extractEmails(text);
    const locMatch = text.match(/\b(?:at|in|@)\s+([A-Z][^,.]+(?:Room|Office|Street|Ave|Blvd|Floor|Building)?)/i);

    return {
      type: "create_event",
      title,
      dateTime: dateTime ?? undefined,
      endDateTime: endDT,
      durationMinutes: duration,
      attendees: attendees.length > 0 ? attendees : undefined,
      location: locMatch ? locMatch[1].trim() : undefined,
      raw,
      confidence: dateTime ? 0.9 : 0.7,
    };
  }

  // ── DELETE EVENT ──
  const deleteTriggers = [
    /\b(cancel|delete|remove|clear) (the |my )?(meeting|event|appointment|call)\b/i,
    /\b(cancel|delete|remove) (the )?[""']?[\w\s]+[""']? (meeting|event|appointment)\b/i,
  ];
  if (deleteTriggers.some((r) => r.test(lower))) {
    const dateTime = extractDateTime(lower, now);
    const title = extractTitle(text);
    return {
      type: "delete_event",
      dateTime: dateTime ?? undefined,
      title: title ?? undefined,
      raw,
      confidence: 0.85,
    };
  }

  // ── CREATE TASK / REMINDER ──
  const taskTriggers = [
    /\b(add|create|set|make) (a )?(reminder|task|to-?do|note)\b/i,
    /\bremind me\b/i,
    /\bdon't (let me )?forget\b/i,
    /\bnote (down|to self)?\b/i,
    /\badd (to|a) (my )?(task list|to-?do|reminders)\b/i,
  ];
  if (taskTriggers.some((r) => r.test(lower))) {
    const due = extractDateTime(lower, now);
    // Extract the actual task content
    const taskTitle = extractTaskTitle(text);
    return {
      type: "create_task",
      taskTitle: taskTitle ?? text,
      taskDue: due ?? undefined,
      raw,
      confidence: 0.9,
    };
  }

  // ── GET TASKS ──
  if (/\b(show|list|what are|get) (my )?(tasks|reminders|to-?do|to do)\b/i.test(lower)) {
    return { type: "get_tasks", raw, confidence: 0.95 };
  }

  return { type: "unknown", raw, confidence: 0 };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function guessEventTitle(lower: string): string {
  if (/standup|stand-up|stand up/.test(lower)) return "Standup";
  if (/sync/.test(lower)) return "Sync";
  if (/interview/.test(lower)) return "Interview";
  if (/lunch/.test(lower)) return "Lunch";
  if (/coffee/.test(lower)) return "Coffee Chat";
  if (/call/.test(lower)) return "Call";
  if (/review/.test(lower)) return "Review";
  if (/planning/.test(lower)) return "Planning Session";
  if (/retrospective|retro/.test(lower)) return "Retrospective";
  if (/one.on.one|1.on.1|1:1/.test(lower)) return "1:1";
  return "Business Meeting";
}

function extractTaskTitle(text: string): string | null {
  // "remind me to X", "add a reminder to X"
  const patterns = [
    /remind me (?:to|about)\s+(.+?)(?:\s+(?:at|by|on|before)\s+.+)?$/i,
    /add (?:a )?(?:reminder|task|to-?do)(?:\s+(?:to|about|for))?\s+(.+?)(?:\s+(?:at|by|on)\s+.+)?$/i,
    /don't (?:let me )?forget (?:to\s+)?(.+?)(?:\s+(?:at|by|on)\s+.+)?$/i,
    /note (?:down )?(?:to self:?\s*)?(.+)$/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return null;
}
