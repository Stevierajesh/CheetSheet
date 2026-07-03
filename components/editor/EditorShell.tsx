'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { initializeStore } from '@/lib/document/store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import Header from './Header';
import WordToolbar from './WordToolbar';
import PageCanvas from './PageCanvas';
import PageTabs from './PageTabs';

type Props = {
  documentId?: string;
};

export default function EditorShell({ documentId }: Props) {
  // Block rendering until the cloud load resolves — otherwise edits made to
  // the placeholder document would be clobbered when the real one arrives.
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found'>('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    initializeStore(documentId).then((found) => {
      if (!cancelled) setStatus(found ? 'ready' : 'not-found');
    });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  useKeyboardShortcuts();

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center text-gray-400">
        Loading document...
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 text-gray-500">
        <p>This document doesn&apos;t exist or you don&apos;t have access to it.</p>
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ← Back to your documents
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <Header />
      <WordToolbar />
      <PageTabs />
      <PageCanvas />
    </div>
  );
}
