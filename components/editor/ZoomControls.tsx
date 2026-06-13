'use client';

import React from 'react';
import { useEditorStore } from '@/lib/document/store';

export default function ZoomControls() {
  const { zoom, setZoom } = useEditorStore();

  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-1">
      <button
        onClick={() => setZoom(zoom - 0.1)}
        className="px-2 py-0.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
        title="Zoom out"
      >
        −
      </button>
      <span className="text-xs text-gray-600 w-12 text-center">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={() => setZoom(zoom + 0.1)}
        className="px-2 py-0.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
        title="Zoom in"
      >
        +
      </button>
      <button
        onClick={() => setZoom(1)}
        className="px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 rounded"
        title="Reset zoom"
      >
        Fit
      </button>
    </div>
  );
}
