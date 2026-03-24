import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/tools";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, to, subject, body: emailBody } = body;

    if (action !== "send_email") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = await sendEmail(
      session.accessToken,
      session.user?.email ?? "",
      {
        to,
        subject,
        body: emailBody,
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json(
      { error: "Failed to send email", success: false },
      { status: 500 },
    );
  }
}
