import { useMemo, useRef, useState } from 'react';

export interface HistoryStore<S> {
  canUndo: boolean;
  canRedo: boolean;
  /** Record the state as it was BEFORE a mutation. Clears the redo stack. */
  push: (label: string, before: S) => void;
  /** Returns the state to restore, pushing `current` onto the redo stack. */
  undo: (current: S) => S | null;
  /** Returns the state to restore, pushing `current` onto the undo stack. */
  redo: (current: S) => S | null;
  reset: () => void;
}

interface Entry<S> {
  label: string;
  state: S;
}

/**
 * Pure undo/redo stacks with a size cap. The undo stack holds before-states:
 * ops push the pre-mutation snapshot, undo swaps the current state for the
 * top entry, redo swaps back. Framework-free so it can be unit tested.
 */
export function createEditHistory<S>(cap = 100): HistoryStore<S> {
  let undoStack: Entry<S>[] = [];
  let redoStack: Entry<S>[] = [];

  return {
    get canUndo() {
      return undoStack.length > 0;
    },
    get canRedo() {
      return redoStack.length > 0;
    },
    push(label, before) {
      undoStack.push({ label, state: before });
      if (undoStack.length > cap) {
        undoStack.shift();
      }
      redoStack = [];
    },
    undo(current) {
      const entry = undoStack.pop();
      if (!entry) return null;
      redoStack.push({ label: entry.label, state: current });
      return entry.state;
    },
    redo(current) {
      const entry = redoStack.pop();
      if (!entry) return null;
      undoStack.push({ label: entry.label, state: current });
      return entry.state;
    },
    reset() {
      undoStack = [];
      redoStack = [];
    },
  };
}

/**
 * React wrapper around createEditHistory: same API, but canUndo/canRedo are
 * reactive so toolbar buttons re-render as the stacks change.
 */
export function useEditHistory<S>(cap = 100): HistoryStore<S> {
  const storeRef = useRef<HistoryStore<S> | null>(null);
  if (storeRef.current == null) {
    storeRef.current = createEditHistory<S>(cap);
  }
  const [, setVersion] = useState(0);

  return useMemo(() => {
    const store = storeRef.current!;
    const bump = () => setVersion(v => v + 1);
    return {
      get canUndo() {
        return store.canUndo;
      },
      get canRedo() {
        return store.canRedo;
      },
      push(label, before) {
        store.push(label, before);
        bump();
      },
      undo(current) {
        const state = store.undo(current);
        bump();
        return state;
      },
      redo(current) {
        const state = store.redo(current);
        bump();
        return state;
      },
      reset() {
        store.reset();
        bump();
      },
    };
  }, []);
}
