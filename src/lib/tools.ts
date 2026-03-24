// src/lib/tools.ts
import {
  getCalendarClient,
  getGmailClient,
  getTasksClient,
  buildEmailMessage,
} from "./google";
import {
  CheckAvailabilityParams,
  GetEventsParams,
  CreateEventParams,
  UpdateEventParams,
  DeleteEventParams,
  SendEmailParams,
  CreateTaskParams,
  ToolResult,
} from "@/types";

export async function checkAvailability(
  accessToken: string,
  params: CheckAvailabilityParams
): Promise<ToolResult> {
  try {
    const calendar = getCalendarClient(accessToken);
    const durationMs = (params.durationMinutes || 60) * 60 * 1000;
    const startTime = new Date(params.dateTime);
    const endTime = new Date(startTime.getTime() + durationMs);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: [{ id: "primary" }],
      },
    });

    const busy = response.data.calendars?.primary?.busy ?? [];
    const isFree = busy.length === 0;

    return {
      success: true,
      data: {
        isFree,
        requestedTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        busySlots: busy,
      },
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getEvents(
  accessToken: string,
  params: GetEventsParams
): Promise<ToolResult> {
  try {
    const calendar = getCalendarClient(accessToken);
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      maxResults: params.maxResults ?? 20,
      singleEvents: true,
      orderBy: "startTime",
    });

    return {
      success: true,
      data: { events: response.data.items ?? [] },
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function createEvent(
  accessToken: string,
  params: CreateEventParams
): Promise<ToolResult> {
  try {
    const calendar = getCalendarClient(accessToken);
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: params.summary,
        description: params.description,
        start: {
          dateTime: params.startDateTime,
          timeZone: params.timeZone ?? "UTC",
        },
        end: {
          dateTime: params.endDateTime,
          timeZone: params.timeZone ?? "UTC",
        },
        attendees: params.attendees?.map((email) => ({ email })),
        location: params.location,
      },
    });

    return {
      success: true,
      data: { event: response.data, eventId: response.data.id },
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateEvent(
  accessToken: string,
  params: UpdateEventParams
): Promise<ToolResult> {
  try {
    const calendar = getCalendarClient(accessToken);

    // Fetch existing event first
    const existing = await calendar.events.get({
      calendarId: "primary",
      eventId: params.eventId,
    });

    const updated = await calendar.events.update({
      calendarId: "primary",
      eventId: params.eventId,
      requestBody: {
        ...existing.data,
        summary: params.summary ?? existing.data.summary,
        description: params.description ?? existing.data.description,
        location: params.location ?? existing.data.location,
        start: params.startDateTime
          ? {
              dateTime: params.startDateTime,
              timeZone: params.timeZone ?? existing.data.start?.timeZone ?? "UTC",
            }
          : existing.data.start,
        end: params.endDateTime
          ? {
              dateTime: params.endDateTime,
              timeZone: params.timeZone ?? existing.data.end?.timeZone ?? "UTC",
            }
          : existing.data.end,
      },
    });

    return { success: true, data: { event: updated.data } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteEvent(
  accessToken: string,
  params: DeleteEventParams
): Promise<ToolResult> {
  try {
    const calendar = getCalendarClient(accessToken);
    await calendar.events.delete({
      calendarId: "primary",
      eventId: params.eventId,
    });

    return { success: true, data: { deleted: true, eventId: params.eventId } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function sendEmail(
  accessToken: string,
  senderEmail: string,
  params: SendEmailParams
): Promise<ToolResult> {
  try {
    const gmail = getGmailClient(accessToken);
    const raw = buildEmailMessage({
      from: senderEmail,
      to: params.to,
      subject: params.subject,
      body: params.body,
    });

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    return { success: true, data: { sent: true, to: params.to } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function createTask(
  accessToken: string,
  params: CreateTaskParams
): Promise<ToolResult> {
  try {
    const tasks = getTasksClient(accessToken);

    // Get or create default task list
    const lists = await tasks.tasklists.list({ maxResults: 1 });
    const listId = lists.data.items?.[0]?.id ?? "@default";

    const task = await tasks.tasks.insert({
      tasklist: listId,
      requestBody: {
        title: params.title,
        notes: params.notes,
        due: params.dueDateTime,
      },
    });

    return { success: true, data: { task: task.data } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getTasks(accessToken: string): Promise<ToolResult> {
  try {
    const tasksClient = getTasksClient(accessToken);
    const lists = await tasksClient.tasklists.list({ maxResults: 1 });
    const listId = lists.data.items?.[0]?.id ?? "@default";

    const response = await tasksClient.tasks.list({
      tasklist: listId,
      showCompleted: false,
      maxResults: 20,
    });

    return { success: true, data: { tasks: response.data.items ?? [] } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
