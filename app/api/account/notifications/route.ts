import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getUserById,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    notificationPreferences: user.notificationPreferences,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const prefs = body as Partial<NotificationPreferences>;

  // Validate structure
  const validEmailKeys = new Set([
    "courseUpdates",
    "newMessages",
    "quizReminders",
    "weeklyDigest",
    "marketingEmails",
  ]);
  const validInAppKeys = new Set([
    "courseUpdates",
    "newMessages",
    "quizReminders",
    "systemAlerts",
  ]);

  if (prefs.email) {
    for (const [key, val] of Object.entries(prefs.email)) {
      if (!validEmailKeys.has(key)) {
        return NextResponse.json(
          { error: `Unknown email preference key: ${key}` },
          { status: 400 }
        );
      }
      if (typeof val !== "boolean") {
        return NextResponse.json(
          { error: `Email preference "${key}" must be a boolean` },
          { status: 400 }
        );
      }
    }
  }

  if (prefs.inApp) {
    for (const [key, val] of Object.entries(prefs.inApp)) {
      if (!validInAppKeys.has(key)) {
        return NextResponse.json(
          { error: `Unknown inApp preference key: ${key}` },
          { status: 400 }
        );
      }
      if (typeof val !== "boolean") {
        return NextResponse.json(
          { error: `InApp preference "${key}" must be a boolean` },
          { status: 400 }
        );
      }
    }
  }

  updateNotificationPreferences(session.userId, prefs);

  const updatedUser = getUserById(session.userId)!;
  return NextResponse.json({
    notificationPreferences: updatedUser.notificationPreferences,
  });
}
