'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import katex from 'katex';
import { Rnd } from 'react-rnd';
import { BlockModel } from '@/types/document';
import { useEditorStore } from '@/lib/document/store';
import BlockRenderer from './BlockRenderer';

type Props = {
  block: BlockModel;
  zoom: number;
};

const GRID_SIZE = 8;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

const SCALABLE_TYPES = ['text', 'heading', 'formula', 'bullet-list'];

export default function EditableBlock({ block, zoom }: Props) {
  const {
    selectedBlockIds,
    selectBlock,
    toggleBlockInSelection,
    updateBlock,
    batchMoveBlocks,
    pushHistory,
  } = useEditorStore();

  const isSelected = selectedBlockIds.includes(block.id);
  const isMultiSelected = selectedBlockIds.length > 1 && isSelected;
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLTextAreaElement>(null);

  // Tracks the starting positions of all selected blocks when a multi-drag begins
  const dragStartRef = useRef<{ x: number; y: number; others: { id: string; x: number; y: number }[] } | null>(null);

  const canEdit = SCALABLE_TYPES.includes(block.type);
  const isScalable = SCALABLE_TYPES.includes(block.type);

  const effectiveFontSize =
    block.styles.fontSize ?? (block.type === 'heading' ? 24 : 14);

  const currentValue =
    block.type === 'bullet-list'
      ? block.items.join('\n')
      : 'content' in block
        ? block.content
        : '';

  const measureValue =
    block.type === 'bullet-list'
      ? block.items
          .map((item) => {
            const prefix =
              block.bulletStyle === 'numbered'
                ? '1. '
                : block.bulletStyle === 'dash'
                  ? '— '
                  : '• ';
            return prefix + item;
          })
          .join('\n')
      : currentValue;

  useEffect(() => {
    if (editing || !isScalable || !measureRef.current) return;
    const ta = measureRef.current;
    ta.style.height = 'auto';
    const needed = ta.scrollHeight;
    if (needed > block.height) {
      updateBlock(block.id, { height: needed } as Partial<BlockModel>);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.styles.fontSize, block.width, block.id, editing]);

  const autoGrow = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const needed = ta.scrollHeight;
    ta.style.height = `${needed}px`;
    if (needed > block.height) {
      updateBlock(block.id, { height: needed } as Partial<BlockModel>);
    }
  }, [block.id, block.height, updateBlock]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
      autoGrow();
    }
  }, [editing, autoGrow]);

  useEffect(() => {
    if (!isSelected) setEditing(false);
  }, [isSelected]);

  const handleDragStart = useCallback(() => {
    pushHistory();
    const { selectedBlockIds: ids, document: doc, currentPageIndex } = useEditorStore.getState();
    if (ids.length > 1 && ids.includes(block.id)) {
      const page = doc.pages[currentPageIndex];
      const others = page.blocks
        .filter((b) => ids.includes(b.id) && b.id !== block.id)
        .map((b) => ({ id: b.id, x: b.x, y: b.y }));
      dragStartRef.current = { x: block.x, y: block.y, others };
    } else {
      dragStartRef.current = null;
    }
  }, [block.id, block.x, block.y, pushHistory]);

  const handleDrag = useCallback(
    (_e: unknown, d: { x: number; y: number }) => {
      const start = dragStartRef.current;
      if (!start || start.others.length === 0) return;
      const dx = d.x - start.x;
      const dy = d.y - start.y;
      const moves = start.others.map((o) => ({
        id: o.id,
        x: snapToGrid(o.x + dx),
        y: snapToGrid(o.y + dy),
      }));
      batchMoveBlocks(moves);
    },
    [batchMoveBlocks]
  );

  const handleDragStop = useCallback(
    (_e: unknown, d: { x: number; y: number }) => {
      const newX = snapToGrid(d.x);
      const newY = snapToGrid(d.y);
      const start = dragStartRef.current;
      if (start && start.others.length > 0) {
        const dx = newX - start.x;
        const dy = newY - start.y;
        batchMoveBlocks([
          { id: block.id, x: newX, y: newY },
          ...start.others.map((o) => ({
            id: o.id,
            x: snapToGrid(o.x + dx),
            y: snapToGrid(o.y + dy),
          })),
        ]);
      } else {
        updateBlock(block.id, { x: newX, y: newY });
      }
      dragStartRef.current = null;
      // Save now that drag is done
      useEditorStore.getState().save();
    },
    [block.id, updateBlock, batchMoveBlocks]
  );

  const handleResizeStop = useCallback(
    (
      _e: unknown,
      _direction: unknown,
      ref: HTMLElement,
      _delta: unknown,
      position: { x: number; y: number }
    ) => {
      pushHistory();
      const newWidth = parseInt(ref.style.width);
      const newHeight = parseInt(ref.style.height);

      const updates: Partial<BlockModel> = {
        width: newWidth,
        height: newHeight,
        x: snapToGrid(position.x),
        y: snapToGrid(position.y),
      };

      if (isScalable) {
        const resolvedNatW = block.naturalWidth ?? block.width;
        const resolvedNatFontSize =
          block.naturalFontSize ??
          block.styles.fontSize ??
          (block.type === 'heading' ? 24 : 14);

        if (!block.naturalWidth) {
          (updates as Record<string, unknown>).naturalWidth = block.width;
          (updates as Record<string, unknown>).naturalHeight = block.height;
          (updates as Record<string, unknown>).naturalFontSize = resolvedNatFontSize;
        }

        const ratio = Math.min(1, newWidth / resolvedNatW);
        const scaledFontSize = Math.max(1, Math.round(resolvedNatFontSize * ratio));
        (updates as Record<string, unknown>).styles = {
          ...block.styles,
          fontSize: scaledFontSize,
        };
      }

      updateBlock(block.id, updates);
    },
    [block.id, block.width, block.height, block.naturalWidth, block.naturalFontSize, block.styles, isScalable, updateBlock, pushHistory]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.shiftKey) {
        toggleBlockInSelection(block.id);
      } else {
        selectBlock(block.id);
      }
    },
    [block.id, selectBlock, toggleBlockInSelection]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!canEdit) return;
      e.stopPropagation();
      pushHistory();
      setEditing(true);
    },
    [canEdit, pushHistory]
  );

  const handleTextChange = useCallback(
    (value: string) => {
      if (block.type === 'bullet-list') {
        updateBlock(block.id, { items: value.split('\n') } as Partial<BlockModel>);
      } else {
        updateBlock(block.id, { content: value } as Partial<BlockModel>);
      }
      setTimeout(autoGrow, 0);
    },
    [block, updateBlock, autoGrow]
  );

  const handleBlur = useCallback(() => {
    setEditing(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') setEditing(false);
      e.stopPropagation();
    },
    []
  );

  const sharedTextareaStyle: React.CSSProperties = {
    width: '100%',
    resize: 'none',
    border: 'none',
    outline: 'none',
    background: block.styles.backgroundColor || 'transparent',
    color: block.styles.textColor || '#000',
    fontSize: effectiveFontSize,
    fontWeight: block.styles.fontWeight || (block.type === 'heading' ? 'bold' : 'normal'),
    textAlign: (block.styles.alignment as React.CSSProperties['textAlign']) || 'left',
    lineHeight: block.styles.lineHeight ? `${block.styles.lineHeight}` : '1.5',
    padding: block.styles.padding || 0,
    fontFamily:
      block.type === 'formula' ? '"Courier New", Consolas, monospace' : 'inherit',
    boxSizing: 'border-box',
  };

  // Multi-select shows a teal outline to distinguish from single-select blue
  const outlineColor = isMultiSelected ? '#0d9488' : '#3b82f6';

  return (
    <Rnd
      size={{ width: block.width, height: block.height }}
      position={{ x: block.x, y: block.y }}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      disableDragging={editing}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      bounds="parent"
      scale={zoom}
      style={{
        zIndex: block.zIndex,
        outline: isSelected ? `2px solid ${outlineColor}` : 'none',
        outlineOffset: '1px',
        cursor: editing ? 'text' : 'move',
      }}
      enableResizing={
        editing || isMultiSelected
          ? false
          : {
              top: true, right: true, bottom: true, left: true,
              topRight: true, bottomRight: true, bottomLeft: true, topLeft: true,
            }
      }
      resizeHandleStyles={{
        topRight: { cursor: 'ne-resize' },
        bottomRight: { cursor: 'se-resize' },
        bottomLeft: { cursor: 'sw-resize' },
        topLeft: { cursor: 'nw-resize' },
      }}
      dragGrid={[GRID_SIZE, GRID_SIZE]}
      resizeGrid={[GRID_SIZE, GRID_SIZE]}
      minWidth={40}
      minHeight={20}
    >
      {isScalable && (
        <textarea
          ref={measureRef}
          value={measureValue}
          readOnly
          aria-hidden
          tabIndex={-1}
          style={{
            ...sharedTextareaStyle,
            paddingLeft:
              block.type === 'bullet-list'
                ? (block.styles.padding || 0) + 20
                : block.styles.padding || 0,
            position: 'absolute',
            visibility: 'hidden',
            pointerEvents: 'none',
            height: 'auto',
            overflow: 'hidden',
          }}
        />
      )}

      {editing && block.type === 'formula' ? (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <textarea
            ref={textareaRef}
            value={currentValue}
            onChange={(e) => handleTextChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              resize: 'none',
              cursor: 'text',
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: block.styles.padding || 0,
              backgroundColor: block.styles.backgroundColor || 'transparent',
              color: block.styles.textColor || '#000',
              overflow: 'hidden',
              pointerEvents: 'none',
              zIndex: 0,
            }}
            dangerouslySetInnerHTML={{
              __html: currentValue.trim()
                ? (() => {
                    try {
                      return katex.renderToString(currentValue, { displayMode: true, throwOnError: false });
                    } catch {
                      return `<span style="color:#ef4444">${currentValue}</span>`;
                    }
                  })()
                : '<span style="color:#9ca3af;font-style:italic">Edit text here</span>',
            }}
          />
        </div>
      ) : editing ? (
        <textarea
          ref={textareaRef}
          value={currentValue}
          placeholder="Edit text here"
          className="placeholder:text-gray-400 placeholder:italic"
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            ...sharedTextareaStyle,
            height: 'auto',
            minHeight: '100%',
            paddingLeft:
              block.type === 'bullet-list'
                ? (block.styles.padding || 0) + 20
                : block.styles.padding || 0,
            overflow: 'hidden',
          }}
        />
      ) : (
        <BlockRenderer block={block} />
      )}
    </Rnd>
  );
}
