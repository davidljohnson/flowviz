import React, { useEffect, useRef, useState } from 'react';
import { Autocomplete, Box, Popover, TextField, createFilterOptions } from '@mui/material';
import type { Instance as PopperInstance } from '@popperjs/core';
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

const matchSuggestions = createFilterOptions<string>();

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
  const popperRef = useRef<PopperInstance>(null);

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
      // The suggestion list is positioned against the input, and the input is
      // still growing when it opens: the field autofocuses on mount, which
      // opens the list, while Popover's Grow transition is part-way through
      // scaling this paper up. Popper measures a smaller, higher anchor and
      // never recomputes, so the list settles 15px too high and covers the very
      // field you are typing in — which is what made an edge label look like it
      // had been picked twice. Re-measure once the growing has finished.
      TransitionProps={{ onEntered: () => popperRef.current?.update() }}
      slotProps={{
        paper: {
          sx: {
            backgroundColor: flowVizTheme.colors.background.raised,
            border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
            borderRadius: flowVizTheme.borderRadius.md,
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
          // A lone suggestion identical to what's already typed tells you
          // nothing — it just prints the word a second time under the field,
          // which is how re-opening the editor on a labelled edge looked like
          // the label had been picked twice. freeSolo means an empty result
          // closes the list rather than replacing it with "No options".
          filterOptions={(options, state) => {
            const matches = matchSuggestions(options, state);
            const typed = state.inputValue.trim().toLowerCase();
            return matches.length === 1 && matches[0].toLowerCase() === typed ? [] : matches;
          }}
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
            popper: { popperRef },
            paper: {
              sx: {
                backgroundColor: flowVizTheme.colors.menu.dialog,
                border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
                // With nothing to list, MUI still renders this paper — empty,
                // but still carrying the border above, which paints as a stray
                // hairline under the field. freeSolo means that happens
                // whenever the text matches no suggestion, and now also
                // whenever it matches one exactly.
                '&:empty': { display: 'none' },
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
