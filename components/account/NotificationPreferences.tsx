"use client";

import { useState } from "react";
import type { NotificationPreferences as Prefs } from "@/lib/db";

interface Props {
  initialPreferences: Prefs;
}

interface Section {
  key: keyof Prefs;
  title: string;
  description: string;
  settings: {
    key: string;
    label: string;
    description: string;
  }[];
}

const SECTIONS: Section[] = [
  {
    key: "email",
    title: "Email Notifications",
    description: "Choose which emails you receive from LearnSphere.",
    settings: [
      {
        key: "courseUpdates",
        label: "Course updates",
        description: "New content, announcements, and changes in enrolled courses.",
      },
      {
        key: "newMessages",
        label: "New messages",
        description: "When instructors or peers send you a message.",
      },
      {
        key: "quizReminders",
        label: "Quiz & assignment reminders",
        description: "Reminders for upcoming deadlines and pending quizzes.",
      },
      {
        key: "weeklyDigest",
        label: "Weekly digest",
        description: "A summary of your progress and activity each week.",
      },
      {
        key: "marketingEmails",
        label: "Product news & offers",
        description: "Tips, new features, and promotional content from LearnSphere.",
      },
    ],
  },
  {
    key: "inApp",
    title: "In-App Notifications",
    description: "Control what appears in your notification bell while using the platform.",
    settings: [
      {
        key: "courseUpdates",
        label: "Course updates",
        description: "Announcements and new content in your courses.",
      },
      {
        key: "newMessages",
        label: "New messages",
        description: "Direct messages from instructors and peers.",
      },
      {
        key: "quizReminders",
        label: "Quiz & assignment reminders",
        description: "Notifications for upcoming deadlines.",
      },
      {
        key: "systemAlerts",
        label: "System alerts",
        description: "Important platform updates and maintenance notices.",
      },
    ],
  },
];

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-indigo-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function NotificationPreferences({ initialPreferences }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  function handleToggle(section: keyof Prefs, key: string, value: boolean) {
    setPrefs((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, boolean>),
        [key]: value,
      },
    }));
    setIsDirty(true);
    setSaveStatus("idle");
  }

  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");

    try {
      const res = await fetch("/api/account/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();

      if (!res.ok) {
        setSaveStatus("error");
        console.error(data.error);
      } else {
        setPrefs(data.notificationPreferences);
        setIsDirty(false);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Notification Preferences</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Decide how and when LearnSphere contacts you.
          </p>
        </div>
        {saveStatus === "saved" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Saved
          </span>
        )}
        {saveStatus === "error" && (
          <span className="text-xs font-medium text-red-600">Failed to save. Try again.</span>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {SECTIONS.map((section) => (
          <div key={section.key} className="px-6 py-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-0.5">{section.title}</h3>
            <p className="text-xs text-gray-500 mb-4">{section.description}</p>

            <div className="space-y-3">
              {section.settings.map((setting) => {
                const sectionPrefs = prefs[section.key] as Record<string, boolean>;
                const checked = sectionPrefs[setting.key] ?? false;

                return (
                  <div key={setting.key} className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{setting.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{setting.description}</p>
                    </div>
                    <div className="flex-shrink-0 mt-0.5">
                      <Toggle
                        checked={checked}
                        onChange={(v) => handleToggle(section.key, setting.key, v)}
                        disabled={saving}
                        label={`${setting.label} ${section.title}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Save button */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Changes are saved to your account and applied immediately.
        </p>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </div>
  );
}
