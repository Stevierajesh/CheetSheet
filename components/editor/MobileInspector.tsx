'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/lib/document/store';
import RightInspector from './RightInspector';

export default function MobileInspector() {
  const { selectedBlockIds } = useEditorStore();
  const [expanded, setExpanded] = useState(false);

  if (!selectedBlockIds[0] && !expanded) return null;

  return (
    <div className="md:hidden border-t border-gray-200 bg-gray-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 text-xs text-gray-500 text-center border-b border-gray-200"
      >
        {expanded ? 'Hide Inspector ▼' : 'Show Inspector ▲'}
      </button>
      {(expanded || selectedBlockIds[0]) && (
        <div className="max-h-64 overflow-y-auto">
          <RightInspector className="w-full border-l-0" />
        </div>
      )}
    </div>
  );
}
