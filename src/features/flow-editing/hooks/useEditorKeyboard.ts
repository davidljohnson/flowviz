import { useEffect } from 'react';

interface UseEditorKeyboardParams {
  /** Disable entirely (e.g. while streaming). */
  enabled: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  /** When a node is selected, Tab adds a connected child (opens the picker). */
  canAddChild?: boolean;
  onAddChild?: () => void;
}

const isTypingTarget = (): boolean => {
  const el = document.activeElement;
  return Boolean(el && (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    (el as HTMLElement).isContentEditable === true
  ));
};

/**
 * Global editing shortcuts: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo,
 * Delete/Backspace delete selection. Follows the same input-focus guard as the
 * story-mode listener so shortcuts never fire while typing. ReactFlow's own
 * deleteKeyCode stays null — deletion routes through the editor ops so it is
 * always history-captured.
 */
export function useEditorKeyboard({ enabled, onUndo, onRedo, onDelete, canAddChild, onAddChild }: UseEditorKeyboardParams) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget()) return;

      const mod = event.ctrlKey || event.metaKey;

      // Tab from a selected node spawns a connected child. Only intercept Tab
      // when something is selected, so normal focus traversal is untouched
      // otherwise.
      if (!mod && event.code === 'Tab' && canAddChild && onAddChild) {
        event.preventDefault();
        onAddChild();
        return;
      }

      if (mod && event.code === 'KeyZ') {
        event.preventDefault();
        if (event.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
        return;
      }

      if (mod && event.code === 'KeyY') {
        event.preventDefault();
        onRedo();
        return;
      }

      if (!mod && (event.code === 'Delete' || event.code === 'Backspace')) {
        event.preventDefault();
        onDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onUndo, onRedo, onDelete, canAddChild, onAddChild]);
}
