// src/types/index.ts

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  location?: string;
  htmlLink?: string;
  colorId?: string;
  status?: string;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: "needsAction" | "completed";
  completed?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  pending?: boolean;
  toolCalls?: ToolCall[];
  confirmationRequired?: ConfirmationPayload;
}

export interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  result?: unknown;
  status: "pending" | "running" | "done" | "error";
}

export interface ConfirmationPayload {
  type: "email" | "event_create" | "event_delete" | "event_update" | "task_create";
  title: string;
  description: string;
  details: Record<string, string>;
  action: AgentAction;
}

export interface AgentAction {
  tool: string;
  params: Record<string, unknown>;
}

// Tool definitions for the AI agent
export interface CheckAvailabilityParams {
  dateTime: string; // ISO 8601
  durationMinutes?: number;
}

export interface GetEventsParams {
  timeMin: string; // ISO 8601
  timeMax: string; // ISO 8601
  maxResults?: number;
}

export interface CreateEventParams {
  summary: string;
  description?: string;
  startDateTime: string; // ISO 8601
  endDateTime: string; // ISO 8601
  attendees?: string[];
  location?: string;
  timeZone?: string;
}

export interface UpdateEventParams {
  eventId: string;
  summary?: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  location?: string;
  timeZone?: string;
}

export interface DeleteEventParams {
  eventId: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

export interface CreateTaskParams {
  title: string;
  notes?: string;
  dueDateTime?: string;
}

export type ToolName =
  | "check_availability"
  | "get_events"
  | "create_event"
  | "update_event"
  | "delete_event"
  | "send_email"
  | "create_task"
  | "get_tasks";

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
