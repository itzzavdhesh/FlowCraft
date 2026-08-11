/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { Block } from '../types';

interface UseKeyboardShortcutsProps {
  blocks: Block[];
  selectedBlockId: string | null;
  currentWorkspace: string;
  onSelectBlock: (id: string | null) => void;
  onDeleteBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
  onSaveWorkspace: (name: string) => void;
  onToggleShortcutsHelp: () => void;
}

export function useKeyboardShortcuts({
  blocks,
  selectedBlockId,
  currentWorkspace,
  onSelectBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onSaveWorkspace,
  onToggleShortcutsHelp,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // Escape works everywhere to clear selection or blur input
      if (e.key === 'Escape') {
        if (isInput) {
          target.blur();
        }
        onSelectBlock(null);
        return;
      }

      // Help Modal shortcut: Shift + ?
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        onToggleShortcutsHelp();
        return;
      }

      // Save shortcut: Ctrl + S / Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSaveWorkspace(currentWorkspace || 'Form-Flow Sandbox');
        return;
      }

      // If user is currently typing in a form input, skip other shortcuts
      if (isInput) return;

      // Select All / Focus Root: Ctrl + A / Cmd + A
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (blocks.length > 0) {
          onSelectBlock(blocks[0].id);
        }
        return;
      }

      // Duplicate Block: Ctrl + D / Cmd + D
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedBlockId) {
          onDuplicateBlock(selectedBlockId);
        }
        return;
      }

      // Delete / Backspace: Delete selected block
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBlockId) {
          e.preventDefault();
          onDeleteBlock(selectedBlockId);
        }
        return;
      }

      // Tab / Shift+Tab: Cycle through blocks
      if (e.key === 'Tab') {
        if (blocks.length === 0) return;
        e.preventDefault();

        const currentIndex = blocks.findIndex((b) => b.id === selectedBlockId);
        if (currentIndex === -1) {
          onSelectBlock(blocks[0].id);
        } else {
          let nextIndex: number;
          if (e.shiftKey) {
            nextIndex = (currentIndex - 1 + blocks.length) % blocks.length;
          } else {
            nextIndex = (currentIndex + 1) % blocks.length;
          }
          onSelectBlock(blocks[nextIndex].id);
        }
        return;
      }

      // Arrow Keys: Smart Graph & Diagram Navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (blocks.length === 0) return;
        e.preventDefault();

        if (!selectedBlockId) {
          onSelectBlock(blocks[0].id);
          return;
        }

        const currentBlock = blocks.find((b) => b.id === selectedBlockId);
        if (!currentBlock) return;

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          // Move to downstream target
          if (currentBlock.type === 'decision') {
            const nextId =
              e.key === 'ArrowRight'
                ? currentBlock.yesTargetId || currentBlock.noTargetId
                : currentBlock.noTargetId || currentBlock.yesTargetId;
            if (nextId) {
              onSelectBlock(nextId);
              return;
            }
          } else if (currentBlock.targetId) {
            onSelectBlock(currentBlock.targetId);
            return;
          }

          // Fallback to next block in array if no explicit graph link
          const idx = blocks.findIndex((b) => b.id === selectedBlockId);
          if (idx !== -1 && idx < blocks.length - 1) {
            onSelectBlock(blocks[idx + 1].id);
          }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          // Move to upstream parent node (node that points to currentBlock.id)
          const parent = blocks.find(
            (b) =>
              b.targetId === currentBlock.id ||
              b.yesTargetId === currentBlock.id ||
              b.noTargetId === currentBlock.id
          );

          if (parent) {
            onSelectBlock(parent.id);
            return;
          }

          // Fallback to previous block in array
          const idx = blocks.findIndex((b) => b.id === selectedBlockId);
          if (idx > 0) {
            onSelectBlock(blocks[idx - 1].id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    blocks,
    selectedBlockId,
    currentWorkspace,
    onSelectBlock,
    onDeleteBlock,
    onDuplicateBlock,
    onSaveWorkspace,
    onToggleShortcutsHelp,
  ]);
}
