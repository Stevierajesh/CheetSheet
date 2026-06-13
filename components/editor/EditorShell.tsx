'use client';

import React, { useEffect } from 'react';
import { initializeStore } from '@/lib/document/store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import Header from './Header';
import WordToolbar from './WordToolbar';
import PageCanvas from './PageCanvas';
import PageTabs from './PageTabs';

export default function EditorShell() {
  useEffect(() => {
    initializeStore();
  }, []);

  useKeyboardShortcuts();

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* App bar — title, save, file menu */}
      <Header />

      {/* Main toolbar — insert + contextual format/block controls */}
      <WordToolbar />

      {/* Page tabs (only visible when > 1 page) */}
      <PageTabs />

      {/* Canvas — takes all remaining space */}
      <PageCanvas />
    </div>
  );
}
