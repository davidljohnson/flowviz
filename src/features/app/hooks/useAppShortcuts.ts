import { useEffect } from 'react';

interface UseAppShortcutsParams {
  /** Off while streaming — none of these are safe mid-analysis. */
  enabled: boolean;
  /** No-ops when the canvas is empty, matching the app bar's own guards. */
  canSave: boolean;
  canExport: boolean;
  onSave: () => void;
  onLoad: () => void;
  onExport: () => void;
  onSettings: () => void;
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
 * The app bar's actions, on the keyboard.
 *
 * These four were mouse-only while the canvas beside them had undo, redo,
 * delete, Tab-to-add and a ⌘K palette — so the half of the product that reaches
 * a file was the half you had to point at. The bindings are the ones people
 * already have in their fingers: ⌘S save, ⌘O open, ⌘E export, ⌘, settings.
 *
 * Every one of them is a browser or OS accelerator too, hence the unconditional
 * preventDefault: without it ⌘S offers to write the page to disk and ⌘O opens a
 * file picker over the top of the app.
 *
 * Guards mirror `useEditorKeyboard` — never while typing, and the disabled
 * commands do nothing rather than opening a dialog whose primary action is
 * already dead.
 */
export function useAppShortcuts({
  enabled,
  canSave,
  canExport,
  onSave,
  onLoad,
  onExport,
  onSettings,
}: UseAppShortcutsParams) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget()) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      // Leave the shifted variants alone: ⌘⇧S is "save as" elsewhere and this
      // has no such command, so swallowing it would just make the key dead.
      if (event.shiftKey || event.altKey) return;

      switch (event.code) {
        case 'KeyS':
          event.preventDefault();
          if (canSave) onSave();
          break;
        case 'KeyO':
          event.preventDefault();
          onLoad();
          break;
        case 'KeyE':
          event.preventDefault();
          if (canExport) onExport();
          break;
        // Comma is the one binding that has to read `key` rather than `code`:
        // `Comma` is a US-layout position, and on the layouts where comma lives
        // elsewhere the code test silently never matches.
        default:
          if (event.key === ',') {
            event.preventDefault();
            onSettings();
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, canSave, canExport, onSave, onLoad, onExport, onSettings]);
}
