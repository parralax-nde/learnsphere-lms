import { getSession } from "@/lib/auth";
import { getUserById } from "@/lib/db";
import { redirect } from "next/navigation";
import PasswordChangeForm from "@/components/account/PasswordChangeForm";
import SocialAccountsManager from "@/components/account/SocialAccountsManager";
import NotificationPreferences from "@/components/account/NotificationPreferences";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Settings – LearnSphere",
};

export default async function AccountSettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?callbackUrl=/account/settings");
  }

  const user = getUserById(session.userId);
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your password, connected accounts, and notification preferences.
        </p>
      </div>

      {/* Password Section */}
      <section>
        <PasswordChangeForm />
      </section>

      {/* Social Accounts Section */}
      <section>
        <SocialAccountsManager
          initialAccounts={user.socialAccounts}
          hasPassword={user.passwordHash !== null}
        />
      </section>

      {/* Notification Preferences Section */}
      <section>
        <NotificationPreferences
          initialPreferences={user.notificationPreferences}
        />
      </section>
    </div>
  );
}
