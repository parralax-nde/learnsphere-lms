import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getUserById,
  linkSocialAccount,
  unlinkSocialAccount,
  getPublicUser,
  type SocialProvider,
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

  return NextResponse.json({ socialAccounts: user.socialAccounts });
}

export async function POST(request: NextRequest) {
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

  const { provider, providerId, email, displayName } = body as Record<string, unknown>;

  if (
    typeof provider !== "string" ||
    typeof providerId !== "string" ||
    typeof email !== "string" ||
    typeof displayName !== "string"
  ) {
    return NextResponse.json(
      { error: "provider, providerId, email, and displayName are required" },
      { status: 400 }
    );
  }

  const validProviders: SocialProvider[] = ["google"];
  if (!validProviders.includes(provider as SocialProvider)) {
    return NextResponse.json(
      { error: `Unsupported provider. Supported: ${validProviders.join(", ")}` },
      { status: 400 }
    );
  }

  linkSocialAccount(session.userId, {
    provider: provider as SocialProvider,
    providerId,
    email,
    displayName,
    linkedAt: new Date().toISOString(),
  });

  const updatedUser = getUserById(session.userId)!;
  return NextResponse.json({ socialAccounts: updatedUser.socialAccounts });
}

export async function DELETE(request: NextRequest) {
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

  const { provider } = body as Record<string, unknown>;

  if (typeof provider !== "string") {
    return NextResponse.json({ error: "provider is required" }, { status: 400 });
  }

  const validProviders: SocialProvider[] = ["google"];
  if (!validProviders.includes(provider as SocialProvider)) {
    return NextResponse.json(
      { error: `Unsupported provider. Supported: ${validProviders.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    unlinkSocialAccount(session.userId, provider as SocialProvider);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }

  const updatedUser = getUserById(session.userId)!;
  return NextResponse.json({
    socialAccounts: getPublicUser(updatedUser).socialAccounts,
  });
}
