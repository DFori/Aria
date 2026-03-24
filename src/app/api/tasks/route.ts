// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTasks, createTask } from "@/lib/tools";
import { CreateTaskParams } from "@/types";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getTasks(session.accessToken);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Tasks API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
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

    if (action !== "create_task") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const result = await createTask(
      session.accessToken,
      params as CreateTaskParams,
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("Tasks API POST error:", err);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
