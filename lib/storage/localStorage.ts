import { DocumentModel } from '@/types/document';

// ── Single-document key (legacy, still used for import/export) ───────────────

const LEGACY_KEY = 'mvp-editor-document';

// ── Multi-document storage ───────────────────────────────────────────────────

const INDEX_KEY = 'mvp-documents-index'; // string[] of document IDs
const DOC_PREFIX = 'mvp-doc-';           // each doc stored at mvp-doc-{id}

/** Return the ordered list of document IDs. */
export function listDocumentIds(): string[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveIndex(ids: string[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

/** Load a single document by ID. */
export function loadDocumentById(id: string): DocumentModel | null {
  try {
    const raw = localStorage.getItem(DOC_PREFIX + id);
    return raw ? (JSON.parse(raw) as DocumentModel) : null;
  } catch {
    return null;
  }
}

/** Save a document (upsert). Adds to index if new. */
export function saveDocument(doc: DocumentModel): void {
  try {
    localStorage.setItem(DOC_PREFIX + doc.id, JSON.stringify(doc));
    const ids = listDocumentIds();
    if (!ids.includes(doc.id)) {
      ids.unshift(doc.id); // newest first
      saveIndex(ids);
    }
  } catch (e) {
    console.error('Failed to save document:', e);
  }
}

/** Delete a document by ID. */
export function deleteDocument(id: string): void {
  localStorage.removeItem(DOC_PREFIX + id);
  const ids = listDocumentIds().filter((i) => i !== id);
  saveIndex(ids);
}

/** Load all documents (for the listing page). */
export function loadAllDocuments(): DocumentModel[] {
  const ids = listDocumentIds();
  const docs: DocumentModel[] = [];
  for (const id of ids) {
    const doc = loadDocumentById(id);
    if (doc) docs.push(doc);
  }
  return docs;
}

/** Migrate a legacy single-document store into the new multi-doc format. */
export function migrateLegacyDocument(): void {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const doc = JSON.parse(raw) as DocumentModel;
    if (doc && doc.id) {
      saveDocument(doc);
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch { /* ignore */ }
}

// ── Import / Export (unchanged) ──────────────────────────────────────────────

/** Kept for backward compat — loads from legacy key. */
export function loadDocument(): DocumentModel | null {
  try {
    const data = localStorage.getItem(LEGACY_KEY);
    if (!data) return null;
    return JSON.parse(data) as DocumentModel;
  } catch {
    return null;
  }
}

export function exportDocumentJSON(doc: DocumentModel): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.title || 'document'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importDocumentJSON(): Promise<DocumentModel> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const doc = JSON.parse(reader.result as string) as DocumentModel;
          resolve(doc);
        } catch {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
