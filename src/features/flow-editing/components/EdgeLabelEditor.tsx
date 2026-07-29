import React, { useEffect, useRef, useState } from 'react';
import { Autocomplete, Box, Popover, TextField, createFilterOptions } from '@mui/material';
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
  // The suggestion list is held shut until the popover has finished growing —
  // see the comment on the Popover below for why. `settled` is a ref because
  // only the openOnFocus/typing handlers read it, and re-rendering on it would
  // be a render nobody is waiting for.
  const [listOpen, setListOpen] = useState(false);
  const settled = useRef(false);

  useEffect(() => {
    setValue(state?.label ?? '');
    setListOpen(false);
    settled.current = false;
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
      // The suggestion list is positioned against the input, and on mount the
      // input is not where it will end up: autofocus opens the list while Grow
      // is still scaling this paper up from the top-left corner of the screen.
      // Popper measures that anchor and paints the list there for a frame,
      // which is the flash of a menu in the top-left before it drops into place
      // under the edge. Worse, the label lands in `value` from an effect, so
      // that first frame filters nothing and the flash is the full fifteen
      // verbs rather than the one or two you would actually see.
      //
      // Re-measuring afterwards was the old fix, and it corrected where the
      // list ended up without stopping it being painted somewhere else first.
      // So the list stays shut until the growing is done. Focus is untouched —
      // the field still takes it on mount, so typing is never dropped.
      TransitionProps={{
        onEntered: () => {
          settled.current = true;
          setListOpen(true);
        },
      }}
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
          open={listOpen}
          // Focus and typing both ask for the list; before the popover has
          // settled the answer is no, and `onEntered` opens it instead.
          onOpen={() => { if (settled.current) setListOpen(true); }}
          onClose={() => setListOpen(false)}
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
