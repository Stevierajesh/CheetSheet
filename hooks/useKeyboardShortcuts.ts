'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/lib/document/store';

export function useKeyboardShortcuts() {
  const {
    selectedBlockIds,
    deleteSelectedBlocks,
    copyBlock,
    pasteBlock,
    undo,
    save,
  } = useEditorStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!isInput && selectedBlockIds.length > 0) {
          e.preventDefault();
          deleteSelectedBlocks();
        }
      }

      if (isMod && e.key === 'z') {
        if (!isInput) {
          e.preventDefault();
          undo();
        }
      }

      if (isMod && e.key === 'c') {
        if (!isInput && selectedBlockIds.length > 0) {
          e.preventDefault();
          copyBlock();
        }
      }

      if (isMod && e.key === 'v') {
        if (!isInput) {
          e.preventDefault();
          pasteBlock();
        }
      }

      if (isMod && e.key === 's') {
        e.preventDefault();
        save();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockIds, deleteSelectedBlocks, copyBlock, pasteBlock, undo, save]);
}
