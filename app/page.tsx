'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuid } from 'uuid';
import {
  listDocumentSummaries,
  saveDocument,
  deleteDocument,
  migrateLocalDocsToCloud,
  DocumentSummary,
} from '@/lib/storage/supabase';
import { importDocumentJSON } from '@/lib/storage/localStorage';
import { createClient } from '@/lib/supabase/client';
import { DocumentModel } from '@/types/document';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function HomePage() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const refresh = useCallback(async () => {
    try {
      await migrateLocalDocsToCloud().catch(() => {});
      setDocs(await listDocumentSummaries());
      setError(null);
    } catch {
      setError('Could not load your documents. Check your connection and try again.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const supabase = createClient();
    supabase.auth.getClaims().then(({ data }) => {
      const claims = data?.claims;
      setEmail((claims?.email as string) ?? null);
      setIsAdmin((claims?.app_metadata as { role?: string } | undefined)?.role === 'admin');
    });
  }, [refresh]);

  const signOut = async () => {
    await createClient().auth.signOut();
    window.location.assign('/login');
  };

  const createNew = async () => {
    const now = new Date().toISOString();
    const doc: DocumentModel = {
      id: uuid(),
      title: 'Untitled Document',
      createdAt: now,
      updatedAt: now,
      pages: [
        {
          id: uuid(),
          size: 'letter-portrait',
          backgroundColor: '#ffffff',
          blocks: [],
        },
      ],
    };
    await saveDocument(doc);
    router.push(`/editor/${doc.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this document? This cannot be undone.')) return;
    await deleteDocument(id);
    refresh();
  };

  const handleImport = async () => {
    try {
      const doc = await importDocumentJSON();
      // Give it a fresh ID so it doesn't collide
      doc.id = uuid();
      doc.updatedAt = new Date().toISOString();
      await saveDocument(doc);
      refresh();
    } catch { /* user cancelled */ }
  };

  if (!loaded) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">CheetSheet</h1>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Admin
              </button>
            )}
            <button
              onClick={handleImport}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Import JSON
            </button>
            <button
              onClick={createNew}
              className="px-4 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Document
            </button>
            <div className="flex items-center gap-2 pl-3 ml-1 border-l border-gray-200">
              {email && <span className="text-xs text-gray-400 hidden sm:inline">{email}</span>}
              <button
                onClick={signOut}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Document grid */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {error ? (
          <div className="text-center py-24 text-sm text-red-500">{error}</div>
        ) : docs.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📄</div>
            <h2 className="text-lg font-medium text-gray-700 mb-2">No documents yet</h2>
            <p className="text-sm text-gray-400 mb-6">Create your first document to get started.</p>
            <button
              onClick={createNew}
              className="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Document
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-medium text-gray-500 mb-4">Recent documents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* New document card */}
              <button
                onClick={createNew}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors min-h-[180px]"
              >
                <span className="text-3xl mb-2">+</span>
                <span className="text-sm">Blank document</span>
              </button>

              {/* Existing documents */}
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => router.push(`/editor/${doc.id}`)}
                  className="group bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                >
                  {/* Preview area */}
                  <div className="h-[120px] bg-white border-b border-gray-100 flex items-center justify-center p-3 overflow-hidden">
                    <div className="w-full h-full bg-gray-50 rounded flex items-start p-2">
                      <div className="space-y-1 w-full">
                        {doc.firstPageBlocks.slice(0, 4).map((block, i) => (
                          <div
                            key={i}
                            className="bg-gray-200 rounded"
                            style={{
                              height: block.type === 'heading' ? 8 : 5,
                              width: `${Math.min(100, Math.max(30, (block.width / 816) * 100))}%`,
                              opacity: 0.5 + i * 0.1,
                            }}
                          />
                        ))}
                        {doc.firstPageBlocks.length === 0 && (
                          <div className="text-xs text-gray-300 text-center pt-6">Empty</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {doc.title || 'Untitled Document'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Edited {formatDate(doc.updatedAt)}
                        {doc.pageCount > 1 && ` · ${doc.pageCount} pages`}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, doc.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all shrink-0"
                      title="Delete"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 4h10M5.5 4V3a1 1 0 011-1h3a1 1 0 011 1v1M6.5 7v4M9.5 7v4M4.5 4l.5 8a1 1 0 001 1h4a1 1 0 001-1l.5-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
