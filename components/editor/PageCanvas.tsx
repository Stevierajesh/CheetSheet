'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '@/lib/document/store';
import { PAGE_DIMENSIONS } from '@/types/document';
import EditableBlock from './EditableBlock';

export const pageRefs: React.RefObject<HTMLDivElement | null>[] = [];

export function scrollToPage(index: number) {
  const el = pageRefs[index]?.current;
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

type Lasso = { startX: number; startY: number; endX: number; endY: number };

export default function PageCanvas() {
  const { document, zoom, selectBlock, selectBlocks, setCurrentPage } = useEditorStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const refsRef = useRef<React.RefObject<HTMLDivElement | null>[]>([]);
  const [lasso, setLasso] = useState<Lasso | null>(null);
  const lassoRef = useRef<Lasso | null>(null);
  const isDraggingLasso = useRef(false);

  const pages = document.pages;

  while (refsRef.current.length < pages.length) {
    refsRef.current.push(React.createRef<HTMLDivElement>());
  }
  refsRef.current.length = pages.length;

  pageRefs.length = 0;
  pages.forEach((_, i) => pageRefs.push(refsRef.current[i]));

  // Sync currentPageIndex as the user scrolls
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const ratios: number[] = new Array(pages.length).fill(0);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = refsRef.current.findIndex((r) => r.current === entry.target);
          if (idx !== -1) ratios[idx] = entry.intersectionRatio;
        });
        const best = ratios.indexOf(Math.max(...ratios));
        if (best !== -1 && best !== useEditorStore.getState().currentPageIndex) {
          setCurrentPage(best);
        }
      },
      { root: container, threshold: Array.from({ length: 11 }, (_, i) => i / 10) }
    );
    refsRef.current.forEach((r) => { if (r.current) observer.observe(r.current); });
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length, setCurrentPage]);

  // Lasso: global mouse move / up handlers
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingLasso.current) return;
      setLasso((prev) => {
        if (!prev) return null;
        const next = { ...prev, endX: e.clientX, endY: e.clientY };
        lassoRef.current = next;
        return next;
      });
    };

    const onMouseUp = () => {
      if (!isDraggingLasso.current) return;
      isDraggingLasso.current = false;
      const l = lassoRef.current;
      if (!l) { setLasso(null); return; }

      const w = Math.abs(l.endX - l.startX);
      const h = Math.abs(l.endY - l.startY);

      if (w < 4 && h < 4) {
        setLasso(null);
        lassoRef.current = null;
        return;
      }

      const selLeft   = Math.min(l.startX, l.endX);
      const selTop    = Math.min(l.startY, l.endY);
      const selRight  = Math.max(l.startX, l.endX);
      const selBottom = Math.max(l.startY, l.endY);

      const { zoom: z, document: doc } = useEditorStore.getState();
      const selectedIds: string[] = [];

      refsRef.current.forEach((r, i) => {
        const pageEl = r.current;
        if (!pageEl) return;
        const pageRect = pageEl.getBoundingClientRect();
        const page = doc.pages[i];
        if (!page) return;

        page.blocks.forEach((block) => {
          const bLeft   = pageRect.left + block.x * z;
          const bTop    = pageRect.top  + block.y * z;
          const bRight  = bLeft + block.width  * z;
          const bBottom = bTop  + block.height * z;

          if (bLeft < selRight && bRight > selLeft && bTop < selBottom && bBottom > selTop) {
            selectedIds.push(block.id);
          }
        });
      });

      useEditorStore.getState().selectBlocks(selectedIds);
      setLasso(null);
      lassoRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Start lasso ONLY from known background surfaces — not from blocks
  const startLasso = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingLasso.current = true;
    const start: Lasso = { startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY };
    lassoRef.current = start;
    setLasso(start);
  }, []);

  // Clear selection when clicking on any background surface
  const handleBgClick = useCallback(() => {
    selectBlock(null);
  }, [selectBlock]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-auto bg-gray-200 select-none"
      // Canvas gray area is a background surface
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) startLasso(e);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleBgClick();
      }}
    >
      {/* Flex wrapper — also a background surface (gap between pages, padding) */}
      <div
        className="flex flex-col items-center py-8 gap-8"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) startLasso(e);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleBgClick();
        }}
      >
        {pages.map((page, i) => {
          const dims = PAGE_DIMENSIONS[page.size];
          const scaledW = dims.width * zoom;
          const scaledH = dims.height * zoom;

          return (
            <div
              key={page.id}
              ref={refsRef.current[i] as React.RefObject<HTMLDivElement>}
              style={{ width: scaledW, height: scaledH, position: 'relative', flexShrink: 0 }}
              // Outer page wrapper is also a background surface
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) startLasso(e);
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) handleBgClick();
              }}
            >
              <div
                data-page-export
                style={{
                  width: dims.width,
                  height: dims.height,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  backgroundColor: page.backgroundColor || '#ffffff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                {/* Transparent page-background div sits behind all blocks (z-0).
                    Clicks on empty page space land here, not on a block. */}
                <div
                  style={{ position: 'absolute', inset: 0, zIndex: 0 }}
                  onMouseDown={startLasso}
                  onClick={handleBgClick}
                />
                {page.blocks.map((block) => (
                  <EditableBlock key={block.id} block={block} zoom={zoom} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lasso selection rectangle */}
      {lasso && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(lasso.startX, lasso.endX),
            top: Math.min(lasso.startY, lasso.endY),
            width: Math.abs(lasso.endX - lasso.startX),
            height: Math.abs(lasso.endY - lasso.startY),
            border: '1.5px solid #3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        />
      )}
    </div>
  );
}
