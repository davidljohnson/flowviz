import { describe, it, expect } from 'vitest';
import { createEditHistory } from './useEditHistory';

interface TestState {
  value: number;
}

const s = (value: number): TestState => ({ value });

describe('createEditHistory', () => {
  it('starts empty', () => {
    const history = createEditHistory<TestState>();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.undo(s(0))).toBeNull();
    expect(history.redo(s(0))).toBeNull();
  });

  it('push then undo returns the before-state', () => {
    const history = createEditHistory<TestState>();
    history.push('edit', s(1));
    expect(history.canUndo).toBe(true);

    const restored = history.undo(s(2));
    expect(restored).toEqual(s(1));
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
  });

  it('redo returns the state that undo replaced', () => {
    const history = createEditHistory<TestState>();
    history.push('edit', s(1));
    history.undo(s(2));

    const redone = history.redo(s(1));
    expect(redone).toEqual(s(2));
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
  });

  it('supports multi-step undo/redo round trips', () => {
    const history = createEditHistory<TestState>();
    // States progress 1 -> 2 -> 3; each push records the pre-mutation state
    history.push('a', s(1));
    history.push('b', s(2));

    expect(history.undo(s(3))).toEqual(s(2));
    expect(history.undo(s(2))).toEqual(s(1));
    expect(history.canUndo).toBe(false);

    expect(history.redo(s(1))).toEqual(s(2));
    expect(history.redo(s(2))).toEqual(s(3));
    expect(history.canRedo).toBe(false);
  });

  it('a new push clears the redo stack', () => {
    const history = createEditHistory<TestState>();
    history.push('a', s(1));
    history.undo(s(2));
    expect(history.canRedo).toBe(true);

    history.push('b', s(1));
    expect(history.canRedo).toBe(false);
  });

  it('caps the undo stack, dropping oldest entries', () => {
    const history = createEditHistory<TestState>(3);
    for (let i = 1; i <= 5; i++) {
      history.push(`edit-${i}`, s(i));
    }
    // Only the 3 most recent before-states survive: 3, 4, 5
    expect(history.undo(s(6))).toEqual(s(5));
    expect(history.undo(s(5))).toEqual(s(4));
    expect(history.undo(s(4))).toEqual(s(3));
    expect(history.canUndo).toBe(false);
  });

  it('reset clears both stacks', () => {
    const history = createEditHistory<TestState>();
    history.push('a', s(1));
    history.undo(s(2));
    history.push('b', s(3));

    history.reset();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });
});
