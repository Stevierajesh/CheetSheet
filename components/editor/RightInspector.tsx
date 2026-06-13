'use client';

import React, { useRef } from 'react';
import { useEditorStore } from '@/lib/document/store';
import { BlockModel, PageSize, BulletStyle } from '@/types/document';

const PAGE_SIZE_OPTIONS: { value: PageSize; label: string }[] = [
  { value: 'letter-portrait', label: 'Letter Portrait' },
  { value: 'letter-landscape', label: 'Letter Landscape' },
  { value: 'a4-portrait', label: 'A4 Portrait' },
  { value: 'a4-landscape', label: 'A4 Landscape' },
];

function InputField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs text-gray-500 flex-1">{label}</span>
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
      />
    </label>
  );
}

function BlockInspector({ block }: { block: BlockModel }) {
  const { updateBlock, deleteBlock, duplicateBlock, bringForward, sendBackward } =
    useEditorStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateStyles = (updates: Record<string, unknown>) => {
    updateBlock(block.id, { styles: { ...block.styles, ...updates } } as Partial<BlockModel>);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateBlock(block.id, { src: reader.result as string } as Partial<BlockModel>);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {block.type} Block
      </div>

      {/* Position & Size */}
      <div className="grid grid-cols-2 gap-2">
        <InputField
          label="X"
          type="number"
          value={block.x}
          onChange={(v) => updateBlock(block.id, { x: parseInt(v) || 0 })}
        />
        <InputField
          label="Y"
          type="number"
          value={block.y}
          onChange={(v) => updateBlock(block.id, { y: parseInt(v) || 0 })}
        />
        <InputField
          label="Width"
          type="number"
          value={block.width}
          onChange={(v) => updateBlock(block.id, { width: parseInt(v) || 40 })}
        />
        <InputField
          label="Height"
          type="number"
          value={block.height}
          onChange={(v) => updateBlock(block.id, { height: parseInt(v) || 20 })}
        />
      </div>

      {/* Content editing for text-like blocks */}
      {(block.type === 'text' || block.type === 'heading' || block.type === 'formula') && (
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500">Content</span>
          <textarea
            value={block.content}
            onChange={(e) =>
              updateBlock(block.id, { content: e.target.value } as Partial<BlockModel>)
            }
            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white min-h-[60px] resize-y"
          />
        </label>
      )}

      {/* Bullet list editing */}
      {block.type === 'bullet-list' && (
        <>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">Items (one per line)</span>
            <textarea
              value={block.items.join('\n')}
              onChange={(e) =>
                updateBlock(block.id, {
                  items: e.target.value.split('\n'),
                } as Partial<BlockModel>)
              }
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white min-h-[80px] resize-y"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">Bullet Style</span>
            <select
              value={block.bulletStyle}
              onChange={(e) =>
                updateBlock(block.id, {
                  bulletStyle: e.target.value as BulletStyle,
                } as Partial<BlockModel>)
              }
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            >
              <option value="dot">Dot (•)</option>
              <option value="dash">Dash (—)</option>
              <option value="numbered">Numbered</option>
            </select>
          </label>
        </>
      )}

      {/* Image upload */}
      {block.type === 'image' && (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded"
          >
            {block.src ? 'Replace Image' : 'Upload Image'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </>
      )}

      {/* Divider controls */}
      {block.type === 'divider' && (
        <>
          <InputField
            label="Thickness"
            type="number"
            value={block.thickness}
            onChange={(v) =>
              updateBlock(block.id, { thickness: parseInt(v) || 1 } as Partial<BlockModel>)
            }
          />
          <ColorField
            label="Line Color"
            value={block.color}
            onChange={(v) =>
              updateBlock(block.id, { color: v } as Partial<BlockModel>)
            }
          />
        </>
      )}

      {/* Style controls */}
      <hr className="border-gray-200" />
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Styles
      </div>

      {block.type !== 'divider' && block.type !== 'image' && (
        <>
          <InputField
            label="Font Size"
            type="number"
            value={block.naturalFontSize ?? block.styles.fontSize ?? 14}
            onChange={(v) => {
              const size = parseInt(v) || 14;
              updateStyles({ fontSize: size });
              updateBlock(block.id, {
                naturalFontSize: size,
                naturalWidth: block.width,
              } as Partial<BlockModel>);
            }}
          />
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">Font Weight</span>
            <select
              value={block.styles.fontWeight || 'normal'}
              onChange={(e) => updateStyles({ fontWeight: e.target.value })}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            >
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="600">Semi-Bold</option>
              <option value="300">Light</option>
            </select>
          </label>
          <ColorField
            label="Text Color"
            value={block.styles.textColor || '#000000'}
            onChange={(v) => updateStyles({ textColor: v })}
          />
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">Alignment</span>
            <select
              value={block.styles.alignment || 'left'}
              onChange={(e) => updateStyles({ alignment: e.target.value })}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
        </>
      )}

      <ColorField
        label="Background"
        value={block.styles.backgroundColor || '#ffffff'}
        onChange={(v) => updateStyles({ backgroundColor: v })}
      />
      <ColorField
        label="Border Color"
        value={block.styles.borderColor || '#000000'}
        onChange={(v) => updateStyles({ borderColor: v })}
      />
      <InputField
        label="Border Width"
        type="number"
        value={block.styles.borderWidth || 0}
        onChange={(v) => updateStyles({ borderWidth: parseInt(v) || 0 })}
      />
      <InputField
        label="Padding"
        type="number"
        value={block.styles.padding || 0}
        onChange={(v) => updateStyles({ padding: parseInt(v) || 0 })}
      />

      {/* Actions */}
      <hr className="border-gray-200" />
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Actions
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => duplicateBlock(block.id)}
          className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded"
        >
          Duplicate
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => bringForward(block.id)}
            className="flex-1 px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded"
          >
            Bring Forward
          </button>
          <button
            onClick={() => sendBackward(block.id)}
            className="flex-1 px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded"
          >
            Send Back
          </button>
        </div>
        <button
          onClick={() => deleteBlock(block.id)}
          className="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded"
        >
          Delete Block
        </button>
      </div>
    </div>
  );
}

function PageInspector() {
  const {
    document,
    currentPageIndex,
    setTitle,
    setPageSize,
    setPageBackground,
    addPage,
    deletePage,
  } = useEditorStore();

  const page = document.pages[currentPageIndex];
  if (!page) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Document
      </div>
      <InputField label="Title" value={document.title} onChange={setTitle} />

      <hr className="border-gray-200" />
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Page {currentPageIndex + 1}
      </div>

      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-gray-500">Page Size</span>
        <select
          value={page.size}
          onChange={(e) => setPageSize(currentPageIndex, e.target.value as PageSize)}
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
        >
          {PAGE_SIZE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <ColorField
        label="Background"
        value={page.backgroundColor}
        onChange={(v) => setPageBackground(currentPageIndex, v)}
      />

      <hr className="border-gray-200" />
      <button
        onClick={() => addPage()}
        className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded"
      >
        Add Page
      </button>
      {document.pages.length > 1 && (
        <button
          onClick={() => deletePage(currentPageIndex)}
          className="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded"
        >
          Delete This Page
        </button>
      )}
    </div>
  );
}

export default function RightInspector({ className }: { className?: string }) {
  const { selectedBlockIds, document, currentPageIndex } = useEditorStore();

  const page = document.pages[currentPageIndex];
  const selectedBlock = page?.blocks.find((b) => b.id === selectedBlockIds[0]);

  return (
    <div className={`w-64 bg-gray-50 border-l border-gray-200 p-3 overflow-y-auto ${className || ''}`}>
      {selectedBlock ? (
        <BlockInspector block={selectedBlock} />
      ) : (
        <PageInspector />
      )}
    </div>
  );
}
