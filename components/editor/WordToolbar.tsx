'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '@/lib/document/store';
import { uploadImage } from '@/lib/storage/supabase';
import { BlockModel, BlockType, PageSize, BulletStyle } from '@/types/document';

// ── tiny shared primitives ────────────────────────────────────────────────────

function Sep() {
  return <div className="self-stretch w-px bg-gray-200 mx-1.5" />;
}

function Btn({
  onClick,
  title,
  active,
  danger,
  children,
}: {
  onClick: () => void;
  title?: string;
  active?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2 py-1 text-xs rounded whitespace-nowrap
        ${active ? 'bg-blue-100 text-blue-700' : danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      {children}
    </button>
  );
}

function Num({
  label,
  value,
  onChange,
  w = 'w-12',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  w?: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-[10px] text-gray-400">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className={`${w} border border-gray-200 rounded px-1 py-0.5 text-xs bg-white focus:outline-none focus:border-blue-400`}
      />
    </div>
  );
}

function Col({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5" title={label}>
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-5 rounded border border-gray-200 cursor-pointer p-0 block"
      />
      <span className="text-[9px] text-gray-400 leading-none">{label}</span>
    </div>
  );
}

// ── Insert group ──────────────────────────────────────────────────────────────

const BLOCKS: { type: BlockType; icon: string; label: string }[] = [
  { type: 'heading',    icon: 'H',  label: 'Heading' },
  { type: 'text',       icon: 'T',  label: 'Text'    },
  { type: 'bullet-list',icon: '≡',  label: 'List'    },
  { type: 'formula',    icon: 'ƒ',  label: 'Formula' },
  { type: 'image',      icon: '⊞',  label: 'Image'   },
  { type: 'divider',    icon: '—',  label: 'Divider' },
  { type: 'box',        icon: '□',  label: 'Box'     },
];

function InsertGroup() {
  const { addBlock, addPage } = useEditorStore();
  return (
    <div className="flex items-center gap-0.5">
      {BLOCKS.map((b) => (
        <button
          key={b.type}
          onClick={() => addBlock(b.type)}
          title={`Insert ${b.label}`}
          className="flex flex-col items-center justify-center px-1.5 py-0.5 rounded hover:bg-gray-100 min-w-[30px] text-gray-700"
        >
          <span className="text-sm font-mono leading-4">{b.icon}</span>
          <span className="text-[9px] text-gray-400 leading-none mt-0.5">{b.label}</span>
        </button>
      ))}
      <button
        onClick={() => addPage()}
        title="Add Page"
        className="flex flex-col items-center justify-center px-1.5 py-0.5 rounded hover:bg-gray-100 min-w-[30px] text-gray-700"
      >
        <span className="text-sm leading-4">＋</span>
        <span className="text-[9px] text-gray-400 leading-none mt-0.5">Page</span>
      </button>
    </div>
  );
}

// ── Text formatting group (context: text-like blocks) ─────────────────────────

const TEXT_TYPES = ['text', 'heading', 'formula', 'bullet-list'];

function TextGroup({ block }: { block: BlockModel }) {
  const { updateBlock, updateSelectedBlockStyles, selectedBlockIds } = useEditorStore();
  const isMulti = selectedBlockIds.length > 1;
  if (!TEXT_TYPES.includes(block.type)) return null;

  const s = block.styles;
  const isBold = s.fontWeight === 'bold' || s.fontWeight === '700';

  const upd = (patch: Record<string, unknown>) => {
    if (isMulti) {
      updateSelectedBlockStyles(patch as Partial<typeof s>);
    } else {
      updateBlock(block.id, { styles: { ...s, ...patch } } as Partial<BlockModel>);
    }
  };

  const updFont = (size: number) => {
    upd({ fontSize: size });
    if (!isMulti) {
      updateBlock(block.id, { naturalFontSize: size, naturalWidth: block.width } as Partial<BlockModel>);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Font size */}
      <div className="flex items-center gap-0.5">
        <span className="text-[10px] text-gray-400">Size</span>
        <input
          type="number"
          value={block.naturalFontSize ?? s.fontSize ?? 14}
          onChange={(e) => updFont(parseInt(e.target.value) || 14)}
          className="w-11 border border-gray-200 rounded px-1 py-0.5 text-xs bg-white focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Bold */}
      <Btn onClick={() => upd({ fontWeight: isBold ? 'normal' : 'bold' })} active={isBold} title="Bold">
        <strong>B</strong>
      </Btn>

      {/* Font weight select */}
      <select
        value={s.fontWeight || 'normal'}
        onChange={(e) => upd({ fontWeight: e.target.value })}
        className="border border-gray-200 rounded px-1 py-0.5 text-xs bg-white focus:outline-none"
        title="Font weight"
      >
        <option value="300">Light</option>
        <option value="normal">Regular</option>
        <option value="600">Semi-Bold</option>
        <option value="bold">Bold</option>
      </select>

      {/* Alignment */}
      <div className="flex border border-gray-200 rounded overflow-hidden">
        {(['left', 'center', 'right'] as const).map((a) => (
          <button
            key={a}
            onClick={() => upd({ alignment: a })}
            title={`Align ${a}`}
            className={`px-1.5 py-0.5 text-xs ${s.alignment === a ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {a === 'left' ? 'L' : a === 'center' ? 'C' : 'R'}
          </button>
        ))}
      </div>

      {/* Colors */}
      <Col label="Text"    value={s.textColor       || '#000000'} onChange={(v) => upd({ textColor: v })} />
      <Col label="Fill"    value={s.backgroundColor || '#ffffff'} onChange={(v) => upd({ backgroundColor: v })} />

      {/* Bullet style (list only) */}
      {block.type === 'bullet-list' && (
        <select
          value={(block as { bulletStyle: BulletStyle }).bulletStyle}
          onChange={(e) =>
            updateBlock(block.id, { bulletStyle: e.target.value as BulletStyle } as Partial<BlockModel>)
          }
          className="border border-gray-200 rounded px-1 py-0.5 text-xs bg-white focus:outline-none"
          title="Bullet style"
        >
          <option value="dot">• Dot</option>
          <option value="dash">— Dash</option>
          <option value="numbered">1. Num</option>
        </select>
      )}
    </div>
  );
}

// ── Block properties group (context: any selected block) ──────────────────────

function BlockGroup({ block }: { block: BlockModel }) {
  const { updateBlock, updateSelectedBlockStyles, deleteSelectedBlocks, duplicateBlock, deleteBlock, bringForward, sendBackward, selectedBlockIds } = useEditorStore();
  const isMulti = selectedBlockIds.length > 1;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upd = (patch: Partial<BlockModel>) => updateBlock(block.id, patch);
  const updStyles = (patch: Record<string, unknown>) => {
    if (isMulti) {
      updateSelectedBlockStyles(patch as Partial<typeof block.styles>);
    } else {
      updateBlock(block.id, { styles: { ...block.styles, ...patch } } as Partial<BlockModel>);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      updateBlock(block.id, { src: url } as Partial<BlockModel>);
    } catch (err) {
      // Upload failed (offline?) — fall back to inline base64 so the user
      // isn't blocked; it still saves inside the document JSON.
      console.warn('Image upload failed, embedding as base64:', err);
      const reader = new FileReader();
      reader.onload = () => updateBlock(block.id, { src: reader.result as string } as Partial<BlockModel>);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Position & size */}
      <Num label="X" value={block.x}      onChange={(v) => upd({ x: v })} />
      <Num label="Y" value={block.y}      onChange={(v) => upd({ y: v })} />
      <Num label="W" value={block.width}  onChange={(v) => upd({ width: Math.max(40, v) })} />
      <Num label="H" value={block.height} onChange={(v) => upd({ height: Math.max(20, v) })} />

      <Sep />

      {/* Border */}
      <Col label="Border" value={block.styles.borderColor || '#000000'} onChange={(v) => updStyles({ borderColor: v })} />
      <Num label="BW" value={block.styles.borderWidth || 0} onChange={(v) => updStyles({ borderWidth: v })} w="w-9" />
      <Num label="Pad" value={block.styles.padding || 0}    onChange={(v) => updStyles({ padding: v })}    w="w-9" />

      {/* Image upload */}
      {block.type === 'image' && (
        <>
          <Btn onClick={() => fileInputRef.current?.click()}>
            {(block as { src: string }).src ? 'Replace ⊞' : 'Upload ⊞'}
          </Btn>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </>
      )}

      {/* Divider-specific */}
      {block.type === 'divider' && (
        <>
          <Num label="Thick" value={(block as { thickness: number }).thickness} onChange={(v) => updateBlock(block.id, { thickness: v } as Partial<BlockModel>)} w="w-10" />
          <Col label="Line" value={(block as { color: string }).color || '#000'} onChange={(v) => updateBlock(block.id, { color: v } as Partial<BlockModel>)} />
        </>
      )}

      <Sep />

      {/* Actions */}
      {!isMulti && (
        <>
          <Btn onClick={() => bringForward(block.id)}   title="Bring Forward">↑ Fwd</Btn>
          <Btn onClick={() => sendBackward(block.id)}   title="Send Backward">↓ Back</Btn>
          <Btn onClick={() => duplicateBlock(block.id)} title="Duplicate">⧉ Dup</Btn>
        </>
      )}
      {isMulti && (
        <span className="text-[10px] text-teal-600 font-medium px-1">{selectedBlockIds.length} selected</span>
      )}
      <Btn onClick={() => isMulti ? deleteSelectedBlocks() : deleteBlock(block.id)} title="Delete" danger>
        ✕ Del
      </Btn>
    </div>
  );
}

// ── Page + Zoom group (always visible, right side) ────────────────────────────

const PAGE_SIZES: { value: PageSize; label: string }[] = [
  { value: 'letter-portrait',  label: 'Letter Portrait'  },
  { value: 'letter-landscape', label: 'Letter Landscape' },
  { value: 'a4-portrait',      label: 'A4 Portrait'      },
  { value: 'a4-landscape',     label: 'A4 Landscape'     },
];

function PageZoomGroup() {
  const {
    document, currentPageIndex,
    zoom, setZoom,
    setPageSize, setPageBackground,
    addPage, deletePage,
  } = useEditorStore();
  const page = document.pages[currentPageIndex];
  if (!page) return null;

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={page.size}
        onChange={(e) => setPageSize(currentPageIndex, e.target.value as PageSize)}
        className="border border-gray-200 rounded px-1 py-0.5 text-xs bg-white focus:outline-none"
        title="Page size"
      >
        {PAGE_SIZES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <Col label="Bg" value={page.backgroundColor} onChange={(v) => setPageBackground(currentPageIndex, v)} />

      <Sep />

      <Btn onClick={() => addPage()} title="Add page">+ Page</Btn>
      {document.pages.length > 1 && (
        <Btn onClick={() => deletePage(currentPageIndex)} danger title="Delete current page">✕ Page</Btn>
      )}

      <Sep />

      {/* Zoom */}
      <Btn onClick={() => setZoom(zoom - 0.1)} title="Zoom out">−</Btn>
      <button
        onClick={() => setZoom(1)}
        className="text-xs text-gray-600 w-10 text-center hover:bg-gray-100 rounded py-0.5"
        title="Reset zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <Btn onClick={() => setZoom(zoom + 0.1)} title="Zoom in">+</Btn>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function WordToolbar() {
  const { document, currentPageIndex, selectedBlockIds } = useEditorStore();
  const page = document.pages[currentPageIndex];
  // Primary block — first in selection — drives the toolbar display values
  const block = page?.blocks.find((b) => b.id === selectedBlockIds[0]) ?? null;

  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const observer = new ResizeObserver(() => {
      setIsOverflowing(inner.scrollWidth > inner.clientWidth + 2);
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  // Close overflow dropdown when block selection changes
  useEffect(() => {
    setOverflowOpen(false);
  }, [selectedBlockIds]);

  return (
    <div
      ref={containerRef}
      className="flex items-center bg-white border-b border-gray-200 overflow-hidden shrink-0"
      style={{ minHeight: 48 }}
    >
      {/* Scrollable inner area — hidden overflow, measured by ResizeObserver */}
      <div
        ref={innerRef}
        className="flex items-center gap-0 px-3 overflow-hidden flex-1 min-w-0"
        style={{ minHeight: 48 }}
      >
        {/* Insert */}
        <InsertGroup />

        <Sep />

        {/* Text formatting — only when a text-capable block is selected */}
        {block && TEXT_TYPES.includes(block.type) && (
          <>
            <TextGroup block={block} />
            <Sep />
          </>
        )}

        {/* Block props — whenever any block is selected */}
        {block && (
          <>
            <BlockGroup block={block} />
            <Sep />
          </>
        )}

        {/* Page + zoom — always, pushed to right */}
        <div className="ml-auto flex items-center">
          <PageZoomGroup />
        </div>
      </div>

      {/* Overflow button — only shown when content clips */}
      {isOverflowing && (
        <div className="relative shrink-0 border-l border-gray-200">
          <button
            onClick={() => setOverflowOpen((o) => !o)}
            className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 h-full"
            style={{ minHeight: 48 }}
            title="More options"
          >
            »
          </button>
          {overflowOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOverflowOpen(false)} />
              <div className="absolute right-0 top-full mt-0.5 bg-white border border-gray-200 rounded shadow-lg z-50 p-2 flex flex-col gap-2 min-w-max">
                {/* Insert row */}
                <div className="flex flex-wrap items-center gap-0.5">
                  <span className="text-[10px] text-gray-400 w-full mb-0.5">Insert</span>
                  <InsertGroup />
                </div>

                {block && TEXT_TYPES.includes(block.type) && (
                  <div className="flex flex-wrap items-center gap-1 border-t border-gray-100 pt-2">
                    <span className="text-[10px] text-gray-400 w-full mb-0.5">Text</span>
                    <TextGroup block={block} />
                  </div>
                )}

                {block && (
                  <div className="flex flex-wrap items-center gap-1 border-t border-gray-100 pt-2">
                    <span className="text-[10px] text-gray-400 w-full mb-0.5">Block</span>
                    <BlockGroup block={block} />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1 border-t border-gray-100 pt-2">
                  <span className="text-[10px] text-gray-400 w-full mb-0.5">Page / Zoom</span>
                  <PageZoomGroup />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
