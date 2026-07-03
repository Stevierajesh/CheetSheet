'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const supabase = createClient();

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setNotice('Check your email for a confirmation link, then sign in.');
          setMode('signin');
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const next = searchParams.get('next');
      // router.push isn't enough here: proxy.ts needs to re-run with the new
      // session cookie, so force a full navigation.
      window.location.assign(next && next.startsWith('/') ? next : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">CheetSheet</h1>
          <p className="text-sm text-gray-400 mt-1">
            {mode === 'signin' ? 'Sign in to your documents' : 'Create an account'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-lg p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-400"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-400"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {notice && <p className="text-sm text-green-600">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button
                onClick={() => { setMode('signup'); setError(null); }}
                className="text-blue-600 hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => { setMode('signin'); setError(null); }}
                className="text-blue-600 hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
