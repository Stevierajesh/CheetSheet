'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/lib/document/store';
import { exportDocumentJSON, importDocumentJSON } from '@/lib/storage/localStorage';
import { exportToPDF } from '@/lib/export/pdf';
import { BlockType } from '@/types/document';

const BLOCK_TYPES: { type: BlockType; label: string }[] = [
  { type: 'heading', label: 'H' },
  { type: 'text', label: 'T' },
  { type: 'bullet-list', label: '≡' },
  { type: 'formula', label: 'ƒ' },
  { type: 'image', label: '⊞' },
  { type: 'divider', label: '—' },
  { type: 'box', label: '□' },
];

export default function MobileToolbar() {
  const { addBlock, addPage, document, setDocument } = useEditorStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="md:hidden border-b border-gray-200 bg-gray-50">
      <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto">
        {BLOCK_TYPES.map((btn) => (
          <button
            key={btn.type}
            onClick={() => addBlock(btn.type)}
            className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded hover:bg-gray-100 whitespace-nowrap"
            title={`Add ${btn.type}`}
          >
            {btn.label}
          </button>
        ))}
        <button
          onClick={() => addPage()}
          className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded hover:bg-gray-100 whitespace-nowrap"
        >
          +Page
        </button>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded hover:bg-gray-100"
        >
          ⋯
        </button>
      </div>
      {menuOpen && (
        <div className="flex flex-col border-t border-gray-200 bg-white">
          <button
            onClick={() => { exportToPDF(document); setMenuOpen(false); }}
            className="px-4 py-2 text-sm text-left hover:bg-gray-100"
          >
            Export PDF
          </button>
          <button
            onClick={() => { exportDocumentJSON(document); setMenuOpen(false); }}
            className="px-4 py-2 text-sm text-left hover:bg-gray-100"
          >
            Export JSON
          </button>
          <button
            onClick={async () => {
              try {
                const doc = await importDocumentJSON();
                setDocument(doc);
              } catch {}
              setMenuOpen(false);
            }}
            className="px-4 py-2 text-sm text-left hover:bg-gray-100"
          >
            Import JSON
          </button>
        </div>
      )}
    </div>
  );
}
