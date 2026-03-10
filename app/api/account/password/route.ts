import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getUserById,
  verifyPassword,
  updatePassword,
} from "@/lib/db";

const MIN_PASSWORD_LENGTH = 8;

function isStrongPassword(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
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

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { currentPassword, newPassword, confirmPassword } = body as Record<string, unknown>;

  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return NextResponse.json(
      { error: "currentPassword, newPassword and confirmPassword are required" },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "New password and confirmation do not match" },
      { status: 400 }
    );
  }

  if (!isStrongPassword(newPassword)) {
    return NextResponse.json(
      {
        error:
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters and include uppercase, lowercase, and a number`,
      },
      { status: 400 }
    );
  }

  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "New password must be different from the current password" },
      { status: 400 }
    );
  }

  const valid = await verifyPassword(user, currentPassword);
  if (!valid) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 }
    );
  }

  await updatePassword(session.userId, newPassword);

  return NextResponse.json({ message: "Password updated successfully" });
}
