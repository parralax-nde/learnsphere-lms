import { useMemo } from 'react';

/**
 * Evaluates the strength of a password against the same rules enforced by the backend.
 *
 * @param {string} password
 * @returns {{ score: number, label: string, color: string, checks: object }}
 */
export function usePasswordStrength(password) {
  return useMemo(() => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;

    const label =
      score <= 1 ? 'Very weak' :
      score === 2 ? 'Weak' :
      score === 3 ? 'Fair' :
      score === 4 ? 'Strong' :
      'Very strong';

    const color =
      score <= 1 ? '#ef4444' :
      score === 2 ? '#f97316' :
      score === 3 ? '#eab308' :
      score === 4 ? '#22c55e' :
      '#16a34a';

    return { score, label, color, checks };
  }, [password]);
}
