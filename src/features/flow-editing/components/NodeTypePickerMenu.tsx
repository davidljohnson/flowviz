import React from 'react';
import { Popover } from '@mui/material';
import { flowVizTheme } from '../../../shared/theme/flowviz-theme';
import { EditorNodeType } from '../utils/nodeFactoryDefaults';
import NodeTypeList from './NodeTypeList';

export interface NodePickerState {
  /** Screen coordinates to anchor the menu. */
  x: number;
  y: number;
  /** Flow coordinates where the new node lands (node center). */
  flowPosition: { x: number; y: number };
  /** Set when opened from a handle drag: the new node connects to this node. */
  connectFrom?: { nodeId: string; handleType: 'source' | 'target' };
}

interface NodeTypePickerMenuProps {
  state: NodePickerState | null;
  onSelect: (type: EditorNodeType, state: NodePickerState) => void;
  onClose: () => void;
}

/**
 * Command-palette-style node picker, anchored at the click point. Shared by the
 * contextual "+", the drag-to-connect drop, right-click, and the keyboard
 * shortcut. The list itself lives in NodeTypeList, which the inspector's
 * change-type switcher also renders — so creating and re-typing a node offer
 * the same control.
 */
const NodeTypePickerMenu: React.FC<NodeTypePickerMenuProps> = ({ state, onSelect, onClose }) => {
  if (!state) return null;

  return (
    <Popover
      open
      anchorReference="anchorPosition"
      anchorPosition={{ top: state.y, left: state.x }}
      onClose={onClose}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            width: 236,
            backgroundColor: flowVizTheme.colors.menu.appBar,
            border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
            borderRadius: flowVizTheme.borderRadius.md,
            boxShadow: flowVizTheme.effects.shadows.lg,
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Remounts per open (Popover unmounts on close), so search resets. */}
      <NodeTypeList
        placeholder="Add node…"
        onChoose={(type) => onSelect(type, state)}
        onDismiss={onClose}
      />
    </Popover>
  );
};

export default NodeTypePickerMenu;
