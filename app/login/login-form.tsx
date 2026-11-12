'use client';

import { useState } from 'react';

// One click and the visitor is in: no credentials to find or type.
export function LoginForm({ destination }: { destination: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function enter() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest: true }),
      });
      if (res.ok) {
        // A full navigation, so the new cookie is sent with the dashboard's first request.
        window.location.assign(destination);
        return;
      }
      setError('Could not open the demo. Try again.');
    } catch {
      setError('Could not reach the server. Try again.');
    }
    setBusy(false);
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <button
        type="button"
        autoFocus
        disabled={busy}
        onClick={enter}
        className="rounded-full bg-pp-blue px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-pp-blue-dark disabled:opacity-50"
      >
        {busy ? 'Opening…' : 'Enter the demo'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-pp-danger">
          {error}
        </p>
      )}
    </div>
  );
}
