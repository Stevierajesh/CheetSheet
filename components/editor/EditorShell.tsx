'use client';

import React, { useEffect } from 'react';
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
  useEffect(() => {
    initializeStore(documentId);
  }, [documentId]);

  useKeyboardShortcuts();

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <Header />
      <WordToolbar />
      <PageTabs />
      <PageCanvas />
    </div>
  );
}
