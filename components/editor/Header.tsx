'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuid } from 'uuid';
import { useEditorStore, flushPendingSave } from '@/lib/document/store';
import {
  exportDocumentJSON,
  importDocumentJSON,
} from '@/lib/storage/localStorage';
import { saveDocument as saveDocToCloud } from '@/lib/storage/supabase';
import { exportToPDF } from '@/lib/export/pdf';
import { DocumentModel } from '@/types/document';

const SAVE_STATUS_LABEL = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed — retrying on next change',
} as const;

export default function Header() {
  const { document, setTitle, undo, save, saveStatus } = useEditorStore();
  const [fileOpen, setFileOpen] = useState(false);
  const router = useRouter();

  const handleNew = async () => {
    // Save current doc first, then navigate to a new blank doc
    await flushPendingSave();
    const now = new Date().toISOString();
    const doc: DocumentModel = {
      id: uuid(),
      title: 'Untitled Document',
      createdAt: now,
      updatedAt: now,
      pages: [
        { id: uuid(), size: 'letter-portrait', backgroundColor: '#ffffff', blocks: [] },
      ],
    };
    await saveDocToCloud(doc);
    router.push(`/editor/${doc.id}`);
  };

  const handleImport = async () => {
    try {
      const doc = await importDocumentJSON();
      doc.id = uuid();
      doc.updatedAt = new Date().toISOString();
      await saveDocToCloud(doc);
      router.push(`/editor/${doc.id}`);
    } catch {}
    setFileOpen(false);
  };

  return (
    <header className="flex items-center gap-3 px-4 py-1.5 bg-white border-b border-gray-300 min-h-[40px] shrink-0">
      {/* Home link */}
      <button
        onClick={() => { save(); router.push('/'); }}
        className="text-base font-bold text-gray-900 shrink-0 hover:text-blue-600 transition-colors"
        title="Back to documents"
      >
        CheetSheet
      </button>

      {/* File controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={save}
          title="Save (Ctrl+S)"
          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-200"
        >
          Save
        </button>
        <button
          onClick={handleNew}
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

      {/* Save status */}
      <span
        className={`text-xs shrink-0 ${
          saveStatus === 'error' ? 'text-red-500' : 'text-gray-400'
        }`}
      >
        {SAVE_STATUS_LABEL[saveStatus]}
      </span>

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
