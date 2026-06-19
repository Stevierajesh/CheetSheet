import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import {
  DocumentModel,
  PageModel,
  BlockModel,
  BlockType,
  BlockStyles,
  PageSize,
  BulletStyle,
} from '@/types/document';
import { saveDocument, loadDocumentById, migrateLegacyDocument } from '@/lib/storage/localStorage';
import { createSeedDocument } from './seed';

type HistoryEntry = {
  document: DocumentModel;
};

type EditorState = {
  document: DocumentModel;
  currentPageIndex: number;
  selectedBlockIds: string[];
  clipboard: BlockModel | null;
  zoom: number;
  history: HistoryEntry[];
  historyIndex: number;
  isMobileSidebarOpen: boolean;

  // Document actions
  setDocument: (doc: DocumentModel) => void;
  newDocument: () => void;
  setTitle: (title: string) => void;

  // Page actions
  addPage: (size?: PageSize) => void;
  deletePage: (index: number) => void;
  setCurrentPage: (index: number) => void;
  setPageSize: (pageIndex: number, size: PageSize) => void;
  setPageBackground: (pageIndex: number, color: string) => void;

  // Block actions
  addBlock: (type: BlockType) => void;
  updateBlock: (blockId: string, updates: Partial<BlockModel>) => void;
  deleteBlock: (blockId: string) => void;
  deleteSelectedBlocks: () => void;
  duplicateBlock: (blockId: string) => void;
  selectBlock: (blockId: string | null) => void;
  selectBlocks: (blockIds: string[]) => void;
  toggleBlockInSelection: (blockId: string) => void;
  moveSelectedBlocks: (dx: number, dy: number) => void;
  batchMoveBlocks: (moves: { id: string; x: number; y: number }[]) => void;
  updateSelectedBlockStyles: (patch: Partial<BlockStyles>) => void;
  bringForward: (blockId: string) => void;
  sendBackward: (blockId: string) => void;

  // Clipboard
  copyBlock: () => void;
  pasteBlock: () => void;

  // Zoom
  setZoom: (zoom: number) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Mobile
  toggleMobileSidebar: () => void;

  // Persistence
  save: () => void;
};

function createNewDocument(): DocumentModel {
  const now = new Date().toISOString();
  return {
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
}

function createDefaultBlock(type: BlockType, page: PageModel): BlockModel {
  const base = {
    id: uuid(),
    x: 40,
    y: 40,
    width: 300,
    height: 60,
    zIndex: page.blocks.length + 1,
    styles: {} as BlockStyles,
  };

  switch (type) {
    case 'text':
      return {
        ...base,
        type: 'text',
        content: '',
        height: 60,
        naturalWidth: 300,
        naturalHeight: 60,
        naturalFontSize: 14,
        styles: { fontSize: 14, textColor: '#1f2937', padding: 8 },
      };
    case 'heading':
      return {
        ...base,
        type: 'heading',
        content: '',
        height: 50,
        naturalWidth: 300,
        naturalHeight: 50,
        naturalFontSize: 24,
        styles: { fontSize: 24, fontWeight: 'bold', textColor: '#111827', padding: 8 },
      };
    case 'bullet-list':
      return {
        ...base,
        type: 'bullet-list',
        items: [''],
        bulletStyle: 'dot' as BulletStyle,
        height: 60,
        naturalWidth: 300,
        naturalHeight: 60,
        naturalFontSize: 14,
        styles: { fontSize: 14, textColor: '#1f2937', padding: 8 },
      };
    case 'formula':
      return {
        ...base,
        type: 'formula',
        content: '',
        height: 50,
        naturalWidth: 300,
        naturalHeight: 50,
        naturalFontSize: 16,
        styles: {
          fontSize: 16,
          textColor: '#1e40af',
          backgroundColor: '#f0f9ff',
          padding: 12,
          borderColor: '#bfdbfe',
          borderWidth: 1,
        },
      };
    case 'image':
      return {
        ...base,
        type: 'image',
        src: '',
        width: 200,
        height: 200,
        styles: { borderColor: '#d1d5db', borderWidth: 1 },
      };
    case 'divider':
      return {
        ...base,
        type: 'divider',
        width: 400,
        height: 4,
        thickness: 2,
        color: '#9ca3af',
        styles: {},
      };
    case 'box':
      return {
        ...base,
        type: 'box',
        width: 300,
        height: 150,
        styles: {
          backgroundColor: '#f3f4f6',
          borderColor: '#d1d5db',
          borderWidth: 1,
          padding: 16,
        },
      };
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(doc: DocumentModel) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDocument(doc);
  }, 500);
}

export const useEditorStore = create<EditorState>((set, get) => ({
  document: createNewDocument(),
  currentPageIndex: 0,
  selectedBlockIds: [],
  clipboard: null,
  zoom: 1,
  history: [],
  historyIndex: -1,
  isMobileSidebarOpen: false,

  setDocument: (doc) => {
    set({ document: doc, currentPageIndex: 0, selectedBlockIds: [], history: [], historyIndex: -1 });
    debouncedSave(doc);
  },

  newDocument: () => {
    const doc = createNewDocument();
    set({ document: doc, currentPageIndex: 0, selectedBlockIds: [], history: [], historyIndex: -1 });
    debouncedSave(doc);
  },

  setTitle: (title) => {
    const doc = { ...get().document, title, updatedAt: new Date().toISOString() };
    set({ document: doc });
    debouncedSave(doc);
  },

  addPage: (size) => {
    get().pushHistory();
    const doc = { ...get().document };
    const newPage: PageModel = {
      id: uuid(),
      size: size || 'letter-portrait',
      backgroundColor: '#ffffff',
      blocks: [],
    };
    doc.pages = [...doc.pages, newPage];
    doc.updatedAt = new Date().toISOString();
    set({ document: doc, currentPageIndex: doc.pages.length - 1 });
    debouncedSave(doc);
  },

  deletePage: (index) => {
    const doc = { ...get().document };
    if (doc.pages.length <= 1) return;
    get().pushHistory();
    doc.pages = doc.pages.filter((_, i) => i !== index);
    doc.updatedAt = new Date().toISOString();
    const newIndex = Math.min(get().currentPageIndex, doc.pages.length - 1);
    set({ document: doc, currentPageIndex: newIndex, selectedBlockIds: [] });
    debouncedSave(doc);
  },

  setCurrentPage: (index) => {
    set({ currentPageIndex: index, selectedBlockIds: [] });
  },

  setPageSize: (pageIndex, size) => {
    get().pushHistory();
    const doc = { ...get().document };
    doc.pages = doc.pages.map((p, i) => (i === pageIndex ? { ...p, size } : p));
    doc.updatedAt = new Date().toISOString();
    set({ document: doc });
    debouncedSave(doc);
  },

  setPageBackground: (pageIndex, color) => {
    const doc = { ...get().document };
    doc.pages = doc.pages.map((p, i) => (i === pageIndex ? { ...p, backgroundColor: color } : p));
    doc.updatedAt = new Date().toISOString();
    set({ document: doc });
    debouncedSave(doc);
  },

  addBlock: (type) => {
    get().pushHistory();
    const doc = { ...get().document };
    const pageIndex = get().currentPageIndex;
    const page = doc.pages[pageIndex];
    const block = createDefaultBlock(type, page);
    doc.pages = doc.pages.map((p, i) =>
      i === pageIndex ? { ...p, blocks: [...p.blocks, block] } : p
    );
    doc.updatedAt = new Date().toISOString();
    set({ document: doc, selectedBlockIds: [block.id] });
    debouncedSave(doc);
  },

  updateBlock: (blockId, updates) => {
    const doc = { ...get().document };
    const pageIndex = get().currentPageIndex;
    doc.pages = doc.pages.map((p, i) =>
      i === pageIndex
        ? {
            ...p,
            blocks: p.blocks.map((b) =>
              b.id === blockId ? ({ ...b, ...updates } as BlockModel) : b
            ),
          }
        : p
    );
    doc.updatedAt = new Date().toISOString();
    set({ document: doc });
    debouncedSave(doc);
  },

  deleteBlock: (blockId) => {
    get().pushHistory();
    const doc = { ...get().document };
    const pageIndex = get().currentPageIndex;
    doc.pages = doc.pages.map((p, i) =>
      i === pageIndex ? { ...p, blocks: p.blocks.filter((b) => b.id !== blockId) } : p
    );
    doc.updatedAt = new Date().toISOString();
    set({ document: doc, selectedBlockIds: [] });
    debouncedSave(doc);
  },

  deleteSelectedBlocks: () => {
    const { selectedBlockIds } = get();
    if (selectedBlockIds.length === 0) return;
    get().pushHistory();
    const doc = { ...get().document };
    const pageIndex = get().currentPageIndex;
    doc.pages = doc.pages.map((p, i) =>
      i === pageIndex
        ? { ...p, blocks: p.blocks.filter((b) => !selectedBlockIds.includes(b.id)) }
        : p
    );
    doc.updatedAt = new Date().toISOString();
    set({ document: doc, selectedBlockIds: [] });
    debouncedSave(doc);
  },

  duplicateBlock: (blockId) => {
    get().pushHistory();
    const doc = { ...get().document };
    const pageIndex = get().currentPageIndex;
    const page = doc.pages[pageIndex];
    const block = page.blocks.find((b) => b.id === blockId);
    if (!block) return;
    const newBlock = {
      ...JSON.parse(JSON.stringify(block)),
      id: uuid(),
      x: block.x + 20,
      y: block.y + 20,
      zIndex: page.blocks.length + 1,
    };
    doc.pages = doc.pages.map((p, i) =>
      i === pageIndex ? { ...p, blocks: [...p.blocks, newBlock] } : p
    );
    doc.updatedAt = new Date().toISOString();
    set({ document: doc, selectedBlockIds: [newBlock.id] });
    debouncedSave(doc);
  },

  selectBlock: (blockId) => set({ selectedBlockIds: blockId ? [blockId] : [] }),

  selectBlocks: (blockIds) => set({ selectedBlockIds: blockIds }),

  toggleBlockInSelection: (blockId) => {
    const { selectedBlockIds } = get();
    const next = selectedBlockIds.includes(blockId)
      ? selectedBlockIds.filter((id) => id !== blockId)
      : [...selectedBlockIds, blockId];
    set({ selectedBlockIds: next });
  },

  moveSelectedBlocks: (dx, dy) => {
    const { selectedBlockIds, document, currentPageIndex } = get();
    if (selectedBlockIds.length === 0) return;
    const doc = { ...document };
    doc.pages = doc.pages.map((p, i) =>
      i === currentPageIndex
        ? {
            ...p,
            blocks: p.blocks.map((b) =>
              selectedBlockIds.includes(b.id)
                ? { ...b, x: b.x + dx, y: b.y + dy }
                : b
            ),
          }
        : p
    );
    doc.updatedAt = new Date().toISOString();
    set({ document: doc });
    debouncedSave(doc);
  },

  batchMoveBlocks: (moves) => {
    const { document, currentPageIndex } = get();
    const lookup = new Map(moves.map((m) => [m.id, m]));
    const doc = { ...document };
    doc.pages = doc.pages.map((p, i) =>
      i === currentPageIndex
        ? {
            ...p,
            blocks: p.blocks.map((b) => {
              const m = lookup.get(b.id);
              return m ? { ...b, x: m.x, y: m.y } : b;
            }),
          }
        : p
    );
    set({ document: doc });
    // No debouncedSave — called on every drag frame; save happens on dragStop
  },

  updateSelectedBlockStyles: (patch) => {
    const { selectedBlockIds, document, currentPageIndex } = get();
    if (selectedBlockIds.length === 0) return;
    const doc = { ...document };
    doc.pages = doc.pages.map((p, i) =>
      i === currentPageIndex
        ? {
            ...p,
            blocks: p.blocks.map((b) =>
              selectedBlockIds.includes(b.id)
                ? { ...b, styles: { ...b.styles, ...patch } }
                : b
            ),
          }
        : p
    );
    doc.updatedAt = new Date().toISOString();
    set({ document: doc });
    debouncedSave(doc);
  },

  bringForward: (blockId) => {
    const doc = { ...get().document };
    const pageIndex = get().currentPageIndex;
    const page = doc.pages[pageIndex];
    const maxZ = Math.max(...page.blocks.map((b) => b.zIndex));
    doc.pages = doc.pages.map((p, i) =>
      i === pageIndex
        ? {
            ...p,
            blocks: p.blocks.map((b) =>
              b.id === blockId ? { ...b, zIndex: maxZ + 1 } : b
            ),
          }
        : p
    );
    set({ document: doc });
    debouncedSave(doc);
  },

  sendBackward: (blockId) => {
    const doc = { ...get().document };
    const pageIndex = get().currentPageIndex;
    const page = doc.pages[pageIndex];
    const minZ = Math.min(...page.blocks.map((b) => b.zIndex));
    doc.pages = doc.pages.map((p, i) =>
      i === pageIndex
        ? {
            ...p,
            blocks: p.blocks.map((b) =>
              b.id === blockId ? { ...b, zIndex: Math.max(0, minZ - 1) } : b
            ),
          }
        : p
    );
    set({ document: doc });
    debouncedSave(doc);
  },

  copyBlock: () => {
    const { selectedBlockIds, document, currentPageIndex } = get();
    const id = selectedBlockIds[0];
    if (!id) return;
    const block = document.pages[currentPageIndex].blocks.find((b) => b.id === id);
    if (block) set({ clipboard: JSON.parse(JSON.stringify(block)) });
  },

  pasteBlock: () => {
    const { clipboard } = get();
    if (!clipboard) return;
    get().pushHistory();
    const doc = { ...get().document };
    const pageIndex = get().currentPageIndex;
    const page = doc.pages[pageIndex];
    const newBlock = {
      ...JSON.parse(JSON.stringify(clipboard)),
      id: uuid(),
      x: clipboard.x + 20,
      y: clipboard.y + 20,
      zIndex: page.blocks.length + 1,
    };
    doc.pages = doc.pages.map((p, i) =>
      i === pageIndex ? { ...p, blocks: [...p.blocks, newBlock] } : p
    );
    doc.updatedAt = new Date().toISOString();
    set({ document: doc, selectedBlockIds: [newBlock.id] });
    debouncedSave(doc);
  },

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(3, zoom)) }),

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < 0) return;
    const entry = history[historyIndex];
    set({
      document: JSON.parse(JSON.stringify(entry.document)),
      historyIndex: historyIndex - 1,
      selectedBlockIds: [],
    });
    debouncedSave(entry.document);
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;
    if (historyIndex + 2 < history.length) {
      const nextEntry = history[historyIndex + 2];
      set({
        document: JSON.parse(JSON.stringify(nextEntry.document)),
        historyIndex: historyIndex + 1,
      });
    }
  },

  pushHistory: () => {
    const { document, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ document: JSON.parse(JSON.stringify(document)) });
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  toggleMobileSidebar: () => set({ isMobileSidebarOpen: !get().isMobileSidebarOpen }),

  save: () => {
    saveDocument(get().document);
  },
}));

// Initialize from localStorage — loads a specific document by ID
export function initializeStore(documentId?: string) {
  migrateLegacyDocument();
  if (documentId) {
    const doc = loadDocumentById(documentId);
    if (doc) {
      useEditorStore.getState().setDocument(doc);
      return;
    }
  }
  // Fallback: create a new document
  const doc = createNewDocument();
  useEditorStore.getState().setDocument(doc);
}
