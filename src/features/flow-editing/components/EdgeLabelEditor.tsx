import React, { useEffect, useState } from 'react';
import { Autocomplete, Box, Popover, TextField } from '@mui/material';
import { flowVizTheme, createScrollbarStyle } from '../../../shared/theme/flowviz-theme';

// Verbs the STIX exporter maps to real relationship types
// (see stixBundleExporter.mapEdgeLabelToSTIXRelationship)
const RELATIONSHIP_SUGGESTIONS = [
  'uses',
  'targets',
  'delivers',
  'drops',
  'downloads',
  'exploits',
  'hosts',
  'communicates with',
  'controls',
  'indicates',
  'impersonates',
  'leads to',
  'enables',
  'requires',
  'affects',
];

export interface EdgeLabelEditorState {
  edgeId: string;
  label: string;
  /** Screen coordinates of the double-click, used to anchor the popover. */
  x: number;
  y: number;
}

interface EdgeLabelEditorProps {
  state: EdgeLabelEditorState | null;
  onCommit: (edgeId: string, label: string) => void;
  onClose: () => void;
}

/**
 * Small popover for editing an edge's label, opened by double-clicking the
 * edge. Free text with STIX-friendly verb suggestions; Enter commits, Escape
 * cancels, clicking away commits.
 */
const EdgeLabelEditor: React.FC<EdgeLabelEditorProps> = ({ state, onCommit, onClose }) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(state?.label ?? '');
  }, [state]);

  if (!state) return null;

  const commit = () => {
    onCommit(state.edgeId, value);
    onClose();
  };

  return (
    <Popover
      open
      anchorReference="anchorPosition"
      anchorPosition={{ top: state.y, left: state.x }}
      onClose={commit}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{
        paper: {
          sx: {
            backgroundColor: flowVizTheme.colors.background.glassLight,
            backdropFilter: flowVizTheme.effects.blur.heavy,
            border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
            borderRadius: `${flowVizTheme.borderRadius.md}px`,
            boxShadow: flowVizTheme.effects.shadows.lg,
            p: 1,
            width: 260,
          },
        },
      }}
    >
      <Box>
        <Autocomplete
          freeSolo
          openOnFocus
          options={RELATIONSHIP_SUGGESTIONS}
          inputValue={value}
          onInputChange={(_e, newValue) => setValue(newValue)}
          onChange={(_e, newValue, reason) => {
            // Picking a suggestion (selectOption) or pressing Enter on free text
            // (createOption) commits in one action — no second click needed.
            if (typeof newValue === 'string' && (reason === 'selectOption' || reason === 'createOption')) {
              onCommit(state.edgeId, newValue);
              onClose();
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              autoFocus
              size="small"
              placeholder="Edge label"
              onKeyDown={(event) => {
                // Let Autocomplete turn Enter into a select/create-option event,
                // which commits via onChange above (avoids a double-commit).
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  onClose();
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: flowVizTheme.colors.text.primary,
                  fontSize: '0.85rem',
                  '& fieldset': { borderColor: flowVizTheme.colors.surface.border.default },
                  '&:hover fieldset': { borderColor: flowVizTheme.colors.surface.border.emphasis },
                  '&.Mui-focused fieldset': { borderColor: flowVizTheme.colors.surface.border.focus },
                },
              }}
            />
          )}
          slotProps={{
            paper: {
              sx: {
                backgroundColor: flowVizTheme.colors.menu.dialog,
                backdropFilter: flowVizTheme.effects.blur.heavy,
                border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
                '& .MuiAutocomplete-option': {
                  fontSize: '0.85rem',
                  color: flowVizTheme.colors.text.secondary,
                  '&:hover': { backgroundColor: flowVizTheme.colors.surface.hover },
                },
                '& .MuiAutocomplete-listbox': createScrollbarStyle(),
              },
            },
          }}
        />
      </Box>
    </Popover>
  );
};

export default EdgeLabelEditor;
