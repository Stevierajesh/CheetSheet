'use client';

import React from 'react';
import { useEditorStore } from '@/lib/document/store';
import { scrollToPage } from './PageCanvas';

export default function PageTabs() {
  const { document, currentPageIndex } = useEditorStore();

  if (document.pages.length <= 1) return null;

  const handleClick = (i: number) => {
    scrollToPage(i);
  };

  return (
    <div className="flex items-center gap-1 px-4 py-1 bg-gray-100 border-b border-gray-200 overflow-x-auto shrink-0">
      {document.pages.map((page, i) => (
        <button
          key={page.id}
          onClick={() => handleClick(i)}
          className={`px-3 py-1 text-sm rounded-t transition-colors whitespace-nowrap ${
            i === currentPageIndex
              ? 'bg-white text-gray-900 border border-b-0 border-gray-200'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
          }`}
        >
          Page {i + 1}
        </button>
      ))}
    </div>
  );
}
