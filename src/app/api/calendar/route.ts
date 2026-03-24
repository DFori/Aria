// src/app/api/calendar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEvents, createEvent, updateEvent, deleteEvent } from "@/lib/tools";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import {
  CreateEventParams,
  UpdateEventParams,
  DeleteEventParams,
} from "@/types";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") ?? "week";

    const now = new Date();
    let timeMin: Date;
    let timeMax: Date;

    if (view === "day") {
      timeMin = startOfDay(now);
      timeMax = endOfDay(now);
    } else if (view === "month") {
      timeMin = new Date(now.getFullYear(), now.getMonth(), 1);
      timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else {
      // week (default)
      timeMin = startOfWeek(now, { weekStartsOn: 0 });
      timeMax = endOfWeek(now, { weekStartsOn: 0 });
    }

    const result = await getEvents(session.accessToken, {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 50,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Calendar API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, params } = body;

    let result;
    switch (action) {
      case "create_event":
        result = await createEvent(
          session.accessToken,
          params as CreateEventParams,
        );
        break;
      case "update_event":
        result = await updateEvent(
          session.accessToken,
          params as UpdateEventParams,
        );
        break;
      case "delete_event":
        result = await deleteEvent(
          session.accessToken,
          params as DeleteEventParams,
        );
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Calendar API POST error:", err);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
