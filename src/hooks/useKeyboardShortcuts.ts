/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { Block } from '../types';
import { findRootBlock } from '../utils/layout';

interface UseKeyboardShortcutsProps {
  blocks: Block[];
  selectedBlockId: string | null;
  currentWorkspace: string;
  showShortcutsHelp?: boolean;
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
  showShortcutsHelp = false,
  onSelectBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onSaveWorkspace,
  onToggleShortcutsHelp,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const isInteractiveElement = (target: HTMLElement | null): boolean => {
      if (!target) return false;
      const tagName = target.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tagName)) return true;
      if (target.isContentEditable) return true;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('[role="dialog"]')
      ) {
        return true;
      }
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;

      // Escape key handler: close modal if open, blur input, or deselect block
      if (e.key === 'Escape') {
        if (showShortcutsHelp) {
          e.preventDefault();
          onToggleShortcutsHelp();
          return;
        }
        if (target && 'blur' in target && typeof (target as any).blur === 'function') {
          (target as any).blur();
        }
        onSelectBlock(null);
        return;
      }

      // Help Modal shortcut: Shift + ? (or ?)
      if (e.key === '?' && !target?.tagName?.match(/^(INPUT|TEXTAREA)$/i)) {
        e.preventDefault();
        onToggleShortcutsHelp();
        return;
      }

      // If the shortcuts help modal is open, do not intercept other canvas navigation
      if (showShortcutsHelp) return;

      // Save shortcut: Ctrl + S / Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSaveWorkspace(currentWorkspace || 'Form-Flow Sandbox');
        return;
      }

      // If user is focused on an interactive control (input, button, link, etc.), skip canvas shortcuts
      if (isInteractiveElement(target)) return;

      // Select All / Focus Root: Ctrl + A / Cmd + A
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const rootBlock = findRootBlock(blocks);
        if (rootBlock) {
          onSelectBlock(rootBlock.id);
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

      // Tab / Shift+Tab: Cycle through blocks on canvas
      if (e.key === 'Tab') {
        if (blocks.length === 0) return;
        e.preventDefault();

        const currentIndex = blocks.findIndex((b) => b.id === selectedBlockId);
        if (currentIndex === -1) {
          const root = findRootBlock(blocks);
          onSelectBlock(root ? root.id : blocks[0].id);
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
          const root = findRootBlock(blocks);
          onSelectBlock(root ? root.id : blocks[0].id);
          return;
        }

        const currentBlock = blocks.find((b) => b.id === selectedBlockId);
        if (!currentBlock) return;

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          // Move to downstream target
          if (currentBlock.type === 'decision') {
            const primaryId = e.key === 'ArrowRight' ? currentBlock.yesTargetId : currentBlock.noTargetId;
            const secondaryId = e.key === 'ArrowRight' ? currentBlock.noTargetId : currentBlock.yesTargetId;

            const validPrimary = primaryId && blocks.some((b) => b.id === primaryId) ? primaryId : null;
            const validSecondary = secondaryId && blocks.some((b) => b.id === secondaryId) ? secondaryId : null;
            const candidateId = validPrimary || validSecondary;

            if (candidateId) {
              onSelectBlock(candidateId);
              return;
            }
          } else if (currentBlock.targetId && blocks.some((b) => b.id === currentBlock.targetId)) {
            onSelectBlock(currentBlock.targetId);
            return;
          }

          // Fallback to next block in array if no valid graph link
          const idx = blocks.findIndex((b) => b.id === selectedBlockId);
          if (idx !== -1 && idx < blocks.length - 1) {
            onSelectBlock(blocks[idx + 1].id);
          }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          // Move to upstream parent node
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
    showShortcutsHelp,
    onSelectBlock,
    onDeleteBlock,
    onDuplicateBlock,
    onSaveWorkspace,
    onToggleShortcutsHelp,
  ]);
}
