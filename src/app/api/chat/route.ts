// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runAgent } from "@/lib/agent";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.error === "RefreshAccessTokenError") {
      return NextResponse.json(
        { error: "Session expired, please sign in again" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { message, conversationHistory = [], timezone = "UTC" } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const response = await runAgent(message, {
      accessToken: session.accessToken,
      userEmail: session.user?.email ?? "",
      userTimezone: timezone,
      conversationHistory,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
