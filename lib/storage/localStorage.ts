import { DocumentModel } from '@/types/document';

const STORAGE_KEY = 'mvp-editor-document';

export function saveDocument(doc: DocumentModel): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch (e) {
    console.error('Failed to save document:', e);
  }
}

export function loadDocument(): DocumentModel | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as DocumentModel;
  } catch (e) {
    console.error('Failed to load document:', e);
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
