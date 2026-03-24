// src/lib/google.ts
import { google } from "googleapis";

export function getOAuthClient(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

export function getCalendarClient(accessToken: string) {
  const auth = getOAuthClient(accessToken);
  return google.calendar({ version: "v3", auth });
}

export function getGmailClient(accessToken: string) {
  const auth = getOAuthClient(accessToken);
  return google.gmail({ version: "v1", auth });
}

export function getTasksClient(accessToken: string) {
  const auth = getOAuthClient(accessToken);
  return google.tasks({ version: "v1", auth });
}

// Build RFC 2822 email message
export function buildEmailMessage(params: {
  from: string;
  to: string;
  subject: string;
  body: string;
}): string {
  const email = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    params.body,
  ].join("\r\n");

  return Buffer.from(email).toString("base64url");
}
