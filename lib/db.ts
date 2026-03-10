import bcrypt from "bcryptjs";

export type SocialProvider = "google";

export interface SocialAccount {
  provider: SocialProvider;
  providerId: string;
  email: string;
  displayName: string;
  linkedAt: string;
}

export interface NotificationPreferences {
  email: {
    courseUpdates: boolean;
    newMessages: boolean;
    quizReminders: boolean;
    weeklyDigest: boolean;
    marketingEmails: boolean;
  };
  inApp: {
    courseUpdates: boolean;
    newMessages: boolean;
    quizReminders: boolean;
    systemAlerts: boolean;
  };
}

export interface User {
  id: string;
  email: string;
  passwordHash: string | null; // null if only OAuth
  firstName: string;
  lastName: string;
  socialAccounts: SocialAccount[];
  notificationPreferences: NotificationPreferences;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  email: {
    courseUpdates: true,
    newMessages: true,
    quizReminders: true,
    weeklyDigest: false,
    marketingEmails: false,
  },
  inApp: {
    courseUpdates: true,
    newMessages: true,
    quizReminders: true,
    systemAlerts: true,
  },
};

// In-memory store – replace with a real database in production
const users: Map<string, User> = new Map();

const usersByEmail: Map<string, string> = new Map(); // email -> userId

// Pre-computed bcrypt hash of "Password123!" (cost 12) for the demo user.
// This avoids an async seed at startup so the user is available immediately.
const DEMO_PASSWORD_HASH =
  "$2b$12$AUi.eb18M2ALTnvkNJhNXOiUkFmSC3Xcj1ETyFEL690PAJWE2wv3O";

// Seed the demo user synchronously at module load time
function seedDemoUser() {
  const demoUser: User = {
    id: "user_demo_001",
    email: "demo@learnsphere.dev",
    passwordHash: DEMO_PASSWORD_HASH,
    firstName: "Demo",
    lastName: "User",
    socialAccounts: [],
    notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFS },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users.set(demoUser.id, demoUser);
  usersByEmail.set(demoUser.email, demoUser.id);
}

seedDemoUser();

// initialize() is kept for backwards-compatibility with tests
export function initialize(): Promise<void> {
  return Promise.resolve();
}

export function getUserById(id: string): User | undefined {
  return users.get(id);
}

export function getUserByEmail(email: string): User | undefined {
  const id = usersByEmail.get(email);
  if (!id) return undefined;
  return users.get(id);
}

export async function verifyPassword(
  user: User,
  password: string
): Promise<boolean> {
  if (!user.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const user = users.get(userId);
  if (!user) throw new Error("User not found");
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.updatedAt = new Date().toISOString();
}

export function linkSocialAccount(
  userId: string,
  account: SocialAccount
): void {
  const user = users.get(userId);
  if (!user) throw new Error("User not found");
  // Remove existing entry for same provider before linking
  user.socialAccounts = user.socialAccounts.filter(
    (a) => a.provider !== account.provider
  );
  user.socialAccounts.push(account);
  user.updatedAt = new Date().toISOString();
}

export function unlinkSocialAccount(
  userId: string,
  provider: SocialProvider
): void {
  const user = users.get(userId);
  if (!user) throw new Error("User not found");
  if (!user.passwordHash && user.socialAccounts.length === 1) {
    throw new Error(
      "Cannot unlink the only login method. Please set a password first."
    );
  }
  user.socialAccounts = user.socialAccounts.filter(
    (a) => a.provider !== provider
  );
  user.updatedAt = new Date().toISOString();
}

export function updateNotificationPreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>
): void {
  const user = users.get(userId);
  if (!user) throw new Error("User not found");
  user.notificationPreferences = {
    email: {
      ...user.notificationPreferences.email,
      ...(prefs.email ?? {}),
    },
    inApp: {
      ...user.notificationPreferences.inApp,
      ...(prefs.inApp ?? {}),
    },
  };
  user.updatedAt = new Date().toISOString();
}

export function getPublicUser(user: User) {
  const { passwordHash: _pw, ...publicFields } = user;
  return publicFields;
}

export { DEFAULT_NOTIFICATION_PREFS };
