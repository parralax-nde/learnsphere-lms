"use client";

import { useState } from "react";
import type { SocialAccount } from "@/lib/db";

interface Props {
  initialAccounts: SocialAccount[];
  hasPassword: boolean;
}

const PROVIDER_META = {
  google: {
    label: "Google",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
    ),
  },
} as const;

type Provider = keyof typeof PROVIDER_META;

// Simulate Google OAuth popup (in production this would redirect to Google)
function simulateGoogleOAuth(): Promise<{
  providerId: string;
  email: string;
  displayName: string;
} | null> {
  return new Promise((resolve) => {
    // In production: open OAuth popup or redirect flow
    // For demo: return simulated data after short delay
    setTimeout(() => {
      resolve({
        providerId: `google_${Date.now()}`,
        email: "demo.google@gmail.com",
        displayName: "Demo Google User",
      });
    }, 800);
  });
}

export default function SocialAccountsManager({ initialAccounts, hasPassword }: Props) {
  const [accounts, setAccounts] = useState<SocialAccount[]>(initialAccounts);
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const providers = Object.keys(PROVIDER_META) as Provider[];

  function getLinkedAccount(provider: Provider) {
    return accounts.find((a) => a.provider === provider);
  }

  async function handleLink(provider: Provider) {
    setError("");
    setSuccess("");
    setLoading(provider);

    try {
      // Simulate OAuth flow
      const oauthResult = await simulateGoogleOAuth();
      if (!oauthResult) {
        setLoading(null);
        return;
      }

      const res = await fetch("/api/account/social-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          ...oauthResult,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to link account.");
      } else {
        setAccounts(data.socialAccounts);
        setSuccess(`Google account linked successfully.`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function handleUnlink(provider: Provider) {
    setError("");
    setSuccess("");
    setLoading(provider);

    try {
      const res = await fetch("/api/account/social-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to unlink account.");
      } else {
        setAccounts(data.socialAccounts);
        setSuccess(`${PROVIDER_META[provider].label} account unlinked.`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Connected Accounts</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Link social accounts for quick, password-free sign-in.
        </p>
      </div>

      <div className="px-6 py-5 space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {providers.map((provider) => {
          const meta = PROVIDER_META[provider];
          const linked = getLinkedAccount(provider);
          const isLoading = loading === provider;

          return (
            <div
              key={provider}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center bg-white">
                  {meta.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                  {linked ? (
                    <p className="text-xs text-gray-500">
                      Connected as <span className="font-medium">{linked.email}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">Not connected</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {linked ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Connected
                    </span>
                    <button
                      onClick={() => handleUnlink(provider)}
                      disabled={isLoading}
                      className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      title={!hasPassword && accounts.length === 1 ? "Cannot unlink the only login method" : `Unlink ${meta.label}`}
                    >
                      {isLoading ? "…" : "Disconnect"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleLink(provider)}
                    disabled={isLoading}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors flex items-center gap-1.5"
                  >
                    {isLoading ? (
                      <>
                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Connecting…
                      </>
                    ) : (
                      `Connect ${meta.label}`
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <p className="text-xs text-gray-400 pt-1">
          {!hasPassword && accounts.length > 0
            ? "⚠️ Set a password before disconnecting your only login method."
            : "You can connect multiple social accounts for easier sign-in."}
        </p>
      </div>
    </div>
  );
}
