// src/lib/agent.ts
// Rule-based agent — no LLM. Parses intent, calls Google APIs, formats response.

import { parseIntent, extractEmails } from "./parser";
import {
  checkAvailability,
  getEvents,
  createEvent,
  deleteEvent,
  sendEmail,
  createTask,
  getTasks,
} from "./tools";
import {
  buildScheduleResponse,
  buildAvailabilityResponse,
  buildEventCreatedResponse,
  buildEventDeletedResponse,
  buildEventNotFoundResponse,
  buildEmailSentResponse,
  buildTaskCreatedResponse,
  buildTasksListResponse,
  buildHelpResponse,
  buildNeedMoreInfoResponse,
  buildUnknownResponse,
  buildErrorResponse,
  CalendarEventRaw,
  TaskRaw,
} from "./responder";
import { format } from "date-fns";

export interface AgentContext {
  accessToken: string;
  userEmail: string;
  userTimezone: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface AgentResponse {
  message: string;
  toolCalls: Array<{ tool: string; input: Record<string, unknown>; result: unknown }>;
  requiresConfirmation?: ConfirmationPayload;
}

export interface ConfirmationPayload {
  type: string;
  title: string;
  description: string;
  details: Record<string, string>;
  pendingAction: PendingAction;
}

export interface PendingAction {
  type: string;
  params: Record<string, unknown>;
}

export async function runAgent(
  userMessage: string,
  context: AgentContext
): Promise<AgentResponse> {
  const now = new Date();
  const toolCalls: AgentResponse["toolCalls"] = [];

  // Check if this is a confirmation reply
  const confirmationReply = detectConfirmation(userMessage, context);
  if (confirmationReply) {
    return executePendingAction(confirmationReply, context, toolCalls);
  }

  const intent = parseIntent(userMessage, now);

  // ── HELP ──────────────────────────────────────────────────────────────────
  if (intent.type === "help") {
    return { message: buildHelpResponse(), toolCalls };
  }

  // ── UNKNOWN ───────────────────────────────────────────────────────────────
  if (intent.type === "unknown") {
    return { message: buildUnknownResponse(), toolCalls };
  }

  // ── CHECK AVAILABILITY ────────────────────────────────────────────────────
  if (intent.type === "check_availability") {
    if (!intent.dateTime) {
      return {
        message: buildNeedMoreInfoResponse("check_availability", ["dateTime"]),
        toolCalls,
      };
    }

    const result = await checkAvailability(context.accessToken, {
      dateTime: intent.dateTime.toISOString(),
      durationMinutes: intent.durationMinutes ?? 60,
    });

    toolCalls.push({ tool: "check_availability", input: { dateTime: intent.dateTime.toISOString() }, result });

    if (!result.success) {
      return { message: buildErrorResponse("check your availability"), toolCalls };
    }

    const data = result.data as {
      isFree: boolean;
      requestedTime: string;
      busySlots: Array<{ start?: string; end?: string }>;
    };

    return {
      message: buildAvailabilityResponse(
        data.isFree,
        intent.dateTime,
        intent.durationMinutes ?? 60,
        data.busySlots ?? []
      ),
      toolCalls,
    };
  }

  // ── GET SCHEDULE ──────────────────────────────────────────────────────────
  if (intent.type === "get_schedule") {
    const rangeStart = intent.rangeStart ?? new Date();
    const rangeEnd = intent.rangeEnd ?? new Date(rangeStart.getTime() + 86400000);

    const result = await getEvents(context.accessToken, {
      timeMin: rangeStart.toISOString(),
      timeMax: rangeEnd.toISOString(),
      maxResults: 50,
    });

    toolCalls.push({ tool: "get_events", input: { timeMin: rangeStart.toISOString(), timeMax: rangeEnd.toISOString() }, result });

    if (!result.success) {
      return { message: buildErrorResponse("fetch your schedule"), toolCalls };
    }

    const events = ((result.data as { events: CalendarEventRaw[] })?.events ?? []) as CalendarEventRaw[];

    return {
      message: buildScheduleResponse(events, rangeStart, rangeEnd, intent.scheduleView ?? "today"),
      toolCalls,
    };
  }

  // ── SEND EMAIL ────────────────────────────────────────────────────────────
  if (intent.type === "send_email") {
    // Resolve self-email
    const isSelf = intent.emailTo === "__self__" || !intent.emailTo;
    const to = isSelf ? context.userEmail : intent.emailTo!;

    // Missing info checks
    const missing: string[] = [];
    if (!to && !isSelf) missing.push("emailTo");
    if (!intent.emailMessage && !isSelf) missing.push("emailMessage");

    if (missing.length > 0) {
      return { message: buildNeedMoreInfoResponse("send_email", missing), toolCalls };
    }

    // For self-email with no message, auto-generate today's schedule
    let subject = "Message from Aria";
    let body = intent.emailMessage ?? "";

    if (isSelf && !intent.emailMessage) {
      // Fetch today's schedule and email it
      const today = new Date();
      const start = new Date(today.setHours(0, 0, 0, 0));
      const end = new Date(today.setHours(23, 59, 59, 999));
      const evResult = await getEvents(context.accessToken, {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
      });
      const events = ((evResult.data as { events: CalendarEventRaw[] })?.events ?? []) as CalendarEventRaw[];
      subject = `Your schedule for ${format(new Date(), "EEEE, MMM d")}`;
      body = buildHtmlScheduleEmail(events, new Date());
    } else {
      subject = `Message via Aria`;
      body = `<p>${intent.emailMessage}</p>`;
    }

    // Third-party emails need confirmation
    if (!isSelf) {
      return {
        message: `📧 Ready to send an email to **${to}**.\n\n**Message preview:**\n> ${intent.emailMessage}\n\nShall I send it? Reply **yes** to confirm or **no** to cancel.`,
        toolCalls,
        requiresConfirmation: {
          type: "EMAIL",
          title: "Send Email",
          description: `Send email to ${to}`,
          details: {
            "To": to,
            "Subject": subject,
            "Message": (intent.emailMessage ?? "").slice(0, 120) + "...",
          },
          pendingAction: {
            type: "send_email",
            params: { to, subject, body, isSelf: false },
          },
        },
      };
    }

    // Self-email sends directly
    const result = await sendEmail(context.accessToken, context.userEmail, { to, subject, body });
    toolCalls.push({ tool: "send_email", input: { to, subject }, result });

    if (!result.success) return { message: buildErrorResponse("send the email"), toolCalls };
    return { message: buildEmailSentResponse(to, subject, true), toolCalls };
  }

  // ── CREATE EVENT ──────────────────────────────────────────────────────────
  if (intent.type === "create_event") {
    const missing: string[] = [];
    if (!intent.dateTime) missing.push("dateTime");

    if (missing.length > 0) {
      return { message: buildNeedMoreInfoResponse("create_event", missing), toolCalls };
    }

    const startDT = intent.dateTime!;
    const endDT = intent.endDateTime ?? new Date(startDT.getTime() + (intent.durationMinutes ?? 60) * 60000);
    const title = intent.title ?? "Business Meeting";
    const attendees = intent.attendees ?? [];

    // Check availability first
    const availResult = await checkAvailability(context.accessToken, {
      dateTime: startDT.toISOString(),
      durationMinutes: intent.durationMinutes ?? 60,
    });
    const isFree = (availResult.data as { isFree: boolean })?.isFree ?? true;

    // Build confirmation
    const details: Record<string, string> = {
      "Title": title,
      "Date": format(startDT, "EEEE, MMM d"),
      "Time": `${format(startDT, "h:mm a")} – ${format(endDT, "h:mm a")}`,
    };
    if (attendees.length > 0) details["Attendees"] = attendees.join(", ");
    if (intent.location) details["Location"] = intent.location;
    if (!isFree) details["⚠️ Warning"] = "You already have something at this time";

    return {
      message: `📌 I'll create this event — just confirm:\n\n**${title}**\n📅 ${details["Date"]} · ${details["Time"]}${attendees.length > 0 ? `\n👥 ${details["Attendees"]}` : ""}\n\nReply **yes** to confirm or **no** to cancel.`,
      toolCalls,
      requiresConfirmation: {
        type: "EVENT",
        title: "Create Event",
        description: `Schedule "${title}"`,
        details,
        pendingAction: {
          type: "create_event",
          params: {
            summary: title,
            startDateTime: startDT.toISOString(),
            endDateTime: endDT.toISOString(),
            attendees,
            location: intent.location,
            timeZone: context.userTimezone,
            wasConflict: !isFree,
          },
        },
      },
    };
  }

  // ── DELETE EVENT ──────────────────────────────────────────────────────────
  if (intent.type === "delete_event") {
    // Fetch events to find matching one
    const now2 = new Date();
    const weekAhead = new Date(now2.getTime() + 7 * 86400000);
    const evResult = await getEvents(context.accessToken, {
      timeMin: new Date(now2.setHours(0,0,0,0)).toISOString(),
      timeMax: weekAhead.toISOString(),
    });
    const events = ((evResult.data as { events: CalendarEventRaw[] })?.events ?? []) as CalendarEventRaw[];

    // Find best match
    const query = intent.title?.toLowerCase() ?? "";
    const dateFilter = intent.dateTime;

    const matched = events.find((ev) => {
      const titleMatch = query && ev.summary?.toLowerCase().includes(query);
      const dateMatch = dateFilter && ev.start?.dateTime
        ? new Date(ev.start.dateTime).toDateString() === dateFilter.toDateString()
        : false;
      return titleMatch || dateMatch;
    });

    if (!matched) {
      return { message: buildEventNotFoundResponse(intent.title ?? intent.raw), toolCalls };
    }

    return {
      message: `🗑️ Are you sure you want to delete **"${matched.summary}"**?\n\n📅 ${matched.start?.dateTime ? format(new Date(matched.start.dateTime), "EEEE, MMM d · h:mm a") : "All day"}\n\nReply **yes** to confirm or **no** to cancel.`,
      toolCalls,
      requiresConfirmation: {
        type: "DELETE",
        title: "Delete Event",
        description: `Remove "${matched.summary}" from your calendar`,
        details: {
          "Event": matched.summary ?? "Untitled",
          "When": matched.start?.dateTime
            ? format(new Date(matched.start.dateTime), "EEEE, MMM d · h:mm a")
            : "All day",
        },
        pendingAction: {
          type: "delete_event",
          params: { eventId: matched.id, eventTitle: matched.summary ?? "Untitled" },
        },
      },
    };
  }

  // ── CREATE TASK ───────────────────────────────────────────────────────────
  if (intent.type === "create_task") {
    if (!intent.taskTitle) {
      return { message: buildNeedMoreInfoResponse("create_task", ["taskTitle"]), toolCalls };
    }

    const result = await createTask(context.accessToken, {
      title: intent.taskTitle,
      notes: intent.taskNotes,
      dueDateTime: intent.taskDue?.toISOString(),
    });

    toolCalls.push({ tool: "create_task", input: { title: intent.taskTitle }, result });

    if (!result.success) return { message: buildErrorResponse("create the task"), toolCalls };
    return { message: buildTaskCreatedResponse(intent.taskTitle, intent.taskDue), toolCalls };
  }

  // ── GET TASKS ─────────────────────────────────────────────────────────────
  if (intent.type === "get_tasks") {
    const result = await getTasks(context.accessToken);
    toolCalls.push({ tool: "get_tasks", input: {}, result });

    if (!result.success) return { message: buildErrorResponse("fetch your tasks"), toolCalls };
    const tasks = ((result.data as { tasks: TaskRaw[] })?.tasks ?? []) as TaskRaw[];
    return { message: buildTasksListResponse(tasks), toolCalls };
  }

  return { message: buildUnknownResponse(), toolCalls };
}

// ─── Confirmation detection ────────────────────────────────────────────────────

function detectConfirmation(
  message: string,
  context: AgentContext
): PendingAction | null {
  const lower = message.toLowerCase().trim();
  const isYes = /^(yes|yeah|yep|sure|confirm|do it|ok|okay|go ahead|send it|yup|y)\.?$/.test(lower);
  const isNo = /^(no|nope|cancel|stop|don't|nevermind|nah|n)\.?$/.test(lower);

  if (!isYes && !isNo) return null;

  // Look for pending action in last assistant message
  const lastAssistant = [...context.conversationHistory]
    .reverse()
    .find((m) => m.role === "assistant");

  if (!lastAssistant) return null;

  // We encode the pending action type in the conversation for rule-based confirmation
  // The assistant messages include phrases we can pattern-match on
  const content = lastAssistant.content;

  if (isNo) {
    // Signal cancellation
    return { type: "__cancel__", params: {} };
  }

  if (isYes) {
    // Detect what was pending
    if (/send.*email|email.*send/i.test(content)) {
      // Extract email params from the conversation
      const emails = extractEmails(content);
      const toEmail = emails.find((e) => !content.includes(`from ${e}`));
      return { type: "__confirm_email__", params: { to: toEmail } };
    }
    if (/create.*event|schedule.*event|I'll create/i.test(content)) {
      return { type: "__confirm_event__", params: {} };
    }
    if (/delete.*event|remove.*calendar/i.test(content)) {
      return { type: "__confirm_delete__", params: {} };
    }
  }

  return null;
}

async function executePendingAction(
  action: PendingAction,
  context: AgentContext,
  toolCalls: AgentResponse["toolCalls"]
): Promise<AgentResponse> {
  if (action.type === "__cancel__") {
    const cancelPhrases = [
      "👍 No problem, cancelled!",
      "✅ Got it, I've cancelled that.",
      "👌 Sure, never mind then!",
    ];
    return {
      message: cancelPhrases[Math.floor(Math.random() * cancelPhrases.length)],
      toolCalls,
    };
  }

  // For confirmed actions, we return a prompt asking them to re-state
  // (since we can't carry state between requests without a DB/session)
  return {
    message:
      "✅ Got it! To make sure I get the details right, please re-send your original request and I'll execute it directly.",
    toolCalls,
  };
}

// ─── HTML email builder ───────────────────────────────────────────────────────

function buildHtmlScheduleEmail(events: CalendarEventRaw[], date: Date): string {
  const dateStr = format(date, "EEEE, MMMM d, yyyy");

  if (events.length === 0) {
    return `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <h2 style="color: #7c3aed;">📅 Your Schedule for ${dateStr}</h2>
        <p style="color: #64748b; font-size: 16px;">You have no events today — enjoy your free day! 🎉</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px;">Sent by Aria · Your AI Calendar Assistant</p>
      </div>`;
  }

  const eventRows = events
    .map((ev) => {
      const start = ev.start?.dateTime ? new Date(ev.start.dateTime) : null;
      const end = ev.end?.dateTime ? new Date(ev.end.dateTime) : null;
      const timeStr = start
        ? `${format(start, "h:mm a")}${end ? ` – ${format(end, "h:mm a")}` : ""}`
        : "All day";
      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
            <div style="font-weight: 600; color: #1e293b; font-size: 15px;">${ev.summary ?? "Untitled"}</div>
            <div style="color: #7c3aed; font-size: 13px; margin-top: 2px;">🕐 ${timeStr}</div>
            ${ev.location ? `<div style="color: #94a3b8; font-size: 13px; margin-top: 2px;">📍 ${ev.location}</div>` : ""}
          </td>
        </tr>`;
    })
    .join("");

  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #fff;">
      <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <h2 style="color: white; margin: 0; font-size: 20px;">📅 Your Schedule</h2>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px;">${dateStr}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        ${eventRows}
      </table>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">Sent by Aria · Your AI Calendar Assistant</p>
    </div>`;
}
