'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/lib/document/store';
import { exportDocumentJSON, importDocumentJSON } from '@/lib/storage/localStorage';
import { exportToPDF } from '@/lib/export/pdf';

export default function Header() {
  const { document, setTitle, newDocument, undo, save } = useEditorStore();
  const [fileOpen, setFileOpen] = useState(false);

  const handleImport = async () => {
    try {
      const doc = await importDocumentJSON();
      useEditorStore.getState().setDocument(doc);
    } catch {}
    setFileOpen(false);
  };

  return (
    <header className="flex items-center gap-3 px-4 py-1.5 bg-white border-b border-gray-300 min-h-[40px] shrink-0">
      {/* App name */}
      <h1 className="text-base font-bold text-gray-900 shrink-0">MVP</h1>

      {/* File controls — left side */}
      <div className="flex items-center gap-1">
        <button
          onClick={save}
          title="Save (Ctrl+S)"
          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-200"
        >
          Save
        </button>
        <button
          onClick={() => {
            if (confirm('Start a new document? Unsaved changes will be lost.')) newDocument();
          }}
          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-200"
        >
          New
        </button>

        {/* File dropdown */}
        <div className="relative">
          <button
            onClick={() => setFileOpen((o) => !o)}
            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-200"
          >
            File ▾
          </button>
          {fileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFileOpen(false)} />
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-[160px] py-1">
                <button onClick={() => { exportToPDF(document); setFileOpen(false); }}
                  className="w-full px-4 py-1.5 text-sm text-left hover:bg-gray-50">
                  Export PDF
                </button>
                <button onClick={() => { exportDocumentJSON(document); setFileOpen(false); }}
                  className="w-full px-4 py-1.5 text-sm text-left hover:bg-gray-50">
                  Export JSON
                </button>
                <hr className="my-1 border-gray-100" />
                <button onClick={handleImport}
                  className="w-full px-4 py-1.5 text-sm text-left hover:bg-gray-50">
                  Import JSON
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Document title — centred */}
      <input
        type="text"
        value={document.title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-sm text-gray-700 border border-transparent hover:border-gray-300 focus:border-gray-400 rounded px-2 py-0.5 outline-none bg-transparent w-40 md:w-64 truncate mx-auto"
        placeholder="Untitled Document"
      />

      {/* Undo — right side */}
      <button
        onClick={undo}
        title="Undo (Ctrl+Z)"
        className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded ml-auto shrink-0"
      >
        ↩ Undo
      </button>
    </header>
  );
}
