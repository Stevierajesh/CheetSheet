'use client';

import React, { useRef } from 'react';
import { useEditorStore } from '@/lib/document/store';
import { exportDocumentJSON, importDocumentJSON } from '@/lib/storage/localStorage';
import { exportToPDF } from '@/lib/export/pdf';
import { BlockType } from '@/types/document';

const BLOCK_BUTTONS: { type: BlockType; label: string; icon: string }[] = [
  { type: 'heading', label: 'Heading', icon: 'H' },
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'bullet-list', label: 'List', icon: '≡' },
  { type: 'formula', label: 'Formula', icon: 'ƒ' },
  { type: 'image', label: 'Image', icon: '⊞' },
  { type: 'divider', label: 'Divider', icon: '—' },
  { type: 'box', label: 'Box', icon: '□' },
];

export default function LeftSidebar({ className }: { className?: string }) {
  const { addBlock, addPage, document, setDocument } = useEditorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    try {
      const doc = await importDocumentJSON();
      setDocument(doc);
    } catch (e) {
      console.error('Import failed:', e);
    }
  };

  return (
    <div className={`w-52 bg-gray-50 border-r border-gray-200 flex flex-col p-3 gap-1 overflow-y-auto ${className || ''}`}>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Add Block
      </div>
      {BLOCK_BUTTONS.map((btn) => (
        <button
          key={btn.type}
          onClick={() => addBlock(btn.type)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors text-left"
        >
          <span className="w-5 text-center font-mono text-base">{btn.icon}</span>
          {btn.label}
        </button>
      ))}

      <hr className="my-2 border-gray-200" />

      <button
        onClick={() => addPage()}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
      >
        <span className="w-5 text-center">+</span>
        Add Page
      </button>

      <hr className="my-2 border-gray-200" />

      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Export / Import
      </div>

      <button
        onClick={() => exportToPDF(document)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
      >
        <span className="w-5 text-center">📄</span>
        Export PDF
      </button>

      <button
        onClick={() => exportDocumentJSON(document)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
      >
        <span className="w-5 text-center">↓</span>
        Export JSON
      </button>

      <button
        onClick={handleImport}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
      >
        <span className="w-5 text-center">↑</span>
        Import JSON
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
      />
    </div>
  );
}
