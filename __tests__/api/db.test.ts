import {
  initialize,
  getUserById,
  getUserByEmail,
  verifyPassword,
  updatePassword,
  linkSocialAccount,
  unlinkSocialAccount,
  updateNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFS,
  type SocialAccount,
} from "@/lib/db";

// Wait for the in-memory seed to complete before running tests
beforeAll(async () => {
  await initialize();
});

describe("db – user lookup", () => {
  it("finds the demo user by id", () => {
    const user = getUserById("user_demo_001");
    expect(user).toBeDefined();
    expect(user!.email).toBe("demo@learnsphere.dev");
  });

  it("finds the demo user by email", () => {
    const user = getUserByEmail("demo@learnsphere.dev");
    expect(user).toBeDefined();
    expect(user!.id).toBe("user_demo_001");
  });

  it("returns undefined for unknown user id", () => {
    expect(getUserById("nonexistent")).toBeUndefined();
  });

  it("returns undefined for unknown email", () => {
    expect(getUserByEmail("unknown@example.com")).toBeUndefined();
  });
});

describe("db – password verification", () => {
  it("verifies the correct password", async () => {
    const user = getUserById("user_demo_001")!;
    await expect(verifyPassword(user, "Password123!")).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const user = getUserById("user_demo_001")!;
    await expect(verifyPassword(user, "WrongPassword")).resolves.toBe(false);
  });

  it("returns false if user has no password hash", async () => {
    const user = getUserById("user_demo_001")!;
    const noHashUser = { ...user, passwordHash: null };
    await expect(verifyPassword(noHashUser, "anypassword")).resolves.toBe(false);
  });
});

describe("db – password update", () => {
  const NEW_PASS = "NewPassword99!";

  afterEach(async () => {
    // Reset password back to original after each test
    await updatePassword("user_demo_001", "Password123!");
  });

  it("updates the password successfully", async () => {
    await updatePassword("user_demo_001", NEW_PASS);
    const user = getUserById("user_demo_001")!;
    await expect(verifyPassword(user, NEW_PASS)).resolves.toBe(true);
  });

  it("rejects old password after update", async () => {
    await updatePassword("user_demo_001", NEW_PASS);
    const user = getUserById("user_demo_001")!;
    await expect(verifyPassword(user, "Password123!")).resolves.toBe(false);
  });

  it("throws for unknown user id", async () => {
    await expect(updatePassword("unknown_id", NEW_PASS)).rejects.toThrow("User not found");
  });
});

describe("db – social accounts", () => {
  const googleAccount: SocialAccount = {
    provider: "google",
    providerId: "g_123",
    email: "test@gmail.com",
    displayName: "Test User",
    linkedAt: new Date().toISOString(),
  };

  afterEach(() => {
    // Clean up any linked accounts
    const user = getUserById("user_demo_001")!;
    user.socialAccounts = [];
  });

  it("links a Google account", () => {
    linkSocialAccount("user_demo_001", googleAccount);
    const user = getUserById("user_demo_001")!;
    expect(user.socialAccounts).toHaveLength(1);
    expect(user.socialAccounts[0].provider).toBe("google");
    expect(user.socialAccounts[0].email).toBe("test@gmail.com");
  });

  it("replaces existing Google account on re-link", () => {
    linkSocialAccount("user_demo_001", googleAccount);
    linkSocialAccount("user_demo_001", { ...googleAccount, email: "new@gmail.com" });
    const user = getUserById("user_demo_001")!;
    expect(user.socialAccounts).toHaveLength(1);
    expect(user.socialAccounts[0].email).toBe("new@gmail.com");
  });

  it("unlinks a Google account", () => {
    linkSocialAccount("user_demo_001", googleAccount);
    // User has a password, so unlink is allowed
    unlinkSocialAccount("user_demo_001", "google");
    const user = getUserById("user_demo_001")!;
    expect(user.socialAccounts).toHaveLength(0);
  });

  it("prevents unlinking the only login method when no password", () => {
    // Remove password hash to simulate OAuth-only account
    const user = getUserById("user_demo_001")!;
    const originalHash = user.passwordHash;
    user.passwordHash = null;
    linkSocialAccount("user_demo_001", googleAccount);

    expect(() => unlinkSocialAccount("user_demo_001", "google")).toThrow(
      "Cannot unlink the only login method"
    );

    // Restore
    user.passwordHash = originalHash;
  });

  it("throws for unknown user id on link", () => {
    expect(() => linkSocialAccount("unknown_id", googleAccount)).toThrow("User not found");
  });

  it("throws for unknown user id on unlink", () => {
    expect(() => unlinkSocialAccount("unknown_id", "google")).toThrow("User not found");
  });
});

describe("db – notification preferences", () => {
  afterEach(() => {
    // Reset to defaults
    updateNotificationPreferences("user_demo_001", DEFAULT_NOTIFICATION_PREFS);
  });

  it("returns default preferences on seeded user", () => {
    const user = getUserById("user_demo_001")!;
    expect(user.notificationPreferences.email.courseUpdates).toBe(true);
    expect(user.notificationPreferences.email.marketingEmails).toBe(false);
    expect(user.notificationPreferences.inApp.systemAlerts).toBe(true);
  });

  it("updates email preferences partially", () => {
    updateNotificationPreferences("user_demo_001", {
      email: { marketingEmails: true, weeklyDigest: true },
    });
    const user = getUserById("user_demo_001")!;
    expect(user.notificationPreferences.email.marketingEmails).toBe(true);
    expect(user.notificationPreferences.email.weeklyDigest).toBe(true);
    // Other prefs should remain unchanged
    expect(user.notificationPreferences.email.courseUpdates).toBe(true);
  });

  it("updates inApp preferences partially", () => {
    updateNotificationPreferences("user_demo_001", {
      inApp: { systemAlerts: false },
    });
    const user = getUserById("user_demo_001")!;
    expect(user.notificationPreferences.inApp.systemAlerts).toBe(false);
    // Other inApp prefs unchanged
    expect(user.notificationPreferences.inApp.courseUpdates).toBe(true);
  });

  it("throws for unknown user id", () => {
    expect(() =>
      updateNotificationPreferences("unknown_id", { email: { marketingEmails: true } })
    ).toThrow("User not found");
  });
});
