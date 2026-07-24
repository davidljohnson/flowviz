import React, { useEffect, useState } from 'react';
import { Autocomplete, Box, InputBase, Typography } from '@mui/material';
import { flowVizTheme, createScrollbarStyle } from '../../../shared/theme/flowviz-theme';
import { inputSx } from './inspectorFieldStyles';
import {
  AttackTechnique,
  loadTechniques,
  searchTechniques,
} from '../data/attackTechniques';

interface TechniqueAutocompleteProps {
  /** Current technique id, e.g. "T1078" (empty string if unset). */
  value: string;
  /**
   * Fires with the picked technique (or null when cleared). Free text that
   * matches no technique fires onFreeText instead.
   */
  onSelect: (technique: AttackTechnique | null) => void;
  onFreeText: (techniqueId: string) => void;
}

/**
 * MUI Autocomplete over the bundled ATT&CK dataset. The dataset lazy-loads on
 * mount (~100KB chunk, cached after first use); search is instant and local,
 * matching id and name with prefix ranking.
 */
const TechniqueAutocomplete: React.FC<TechniqueAutocompleteProps> = ({
  value,
  onSelect,
  onFreeText,
}) => {
  const [techniques, setTechniques] = useState<AttackTechnique[]>([]);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    let cancelled = false;
    loadTechniques().then(data => {
      if (!cancelled) setTechniques(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = techniques.find(t => t.id === value) ?? null;

  return (
    <Autocomplete
      freeSolo
      size="small"
      options={techniques}
      value={selected}
      inputValue={inputValue}
      loading={techniques.length === 0}
      onInputChange={(_e, newInput) => setInputValue(newInput)}
      onChange={(_e, newValue) => {
        if (typeof newValue === 'string') {
          onFreeText(newValue.trim());
        } else {
          onSelect(newValue);
        }
      }}
      onBlur={() => {
        // Free-typed id (e.g. "T1078.004") without picking an option
        const trimmed = inputValue.trim();
        if (trimmed && trimmed !== (selected ? `${selected.id} ${selected.name}` : '') && !selected) {
          onFreeText(trimmed);
        }
      }}
      filterOptions={(options, state) => searchTechniques(options, state.inputValue)}
      getOptionLabel={(option) =>
        typeof option === 'string' ? option : `${option.id} ${option.name}`
      }
      isOptionEqualToValue={(option, val) => option.id === val.id}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id} sx={{ display: 'flex', gap: 1 }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: flowVizTheme.colors.text.tertiary, minWidth: 72 }}>
            {option.id}
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: flowVizTheme.colors.text.secondary }} noWrap>
            {option.name}
          </Typography>
        </Box>
      )}
      renderInput={(params) => (
        // InputBase carrying the shared inputSx, not a TextField, so this reads
        // identically to every other inspector field. params.InputProps brings
        // the Autocomplete wiring (root ref for the popper, the clear/dropdown
        // end adornment); params.inputProps is the native input.
        <InputBase
          {...params.InputProps}
          inputProps={params.inputProps}
          placeholder="Technique (T1078, Valid Accounts...)"
          sx={{
            ...inputSx,
            // Room for the absolutely-positioned clear/dropdown icons, which
            // Autocomplete only pads for automatically inside its own TextField.
            pr: 4,
            '& .MuiAutocomplete-endAdornment': {
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
            },
            '& .MuiAutocomplete-endAdornment .MuiSvgIcon-root': {
              color: flowVizTheme.colors.text.tertiary,
              fontSize: '1.1rem',
            },
          }}
        />
      )}
      slotProps={{
        popper: {
          // Keep the dropdown usable at canvas zoom levels
          sx: { zIndex: 2000 },
        },
        paper: {
          sx: {
            backgroundColor: flowVizTheme.colors.menu.dialog,
            backdropFilter: flowVizTheme.effects.blur.heavy,
            border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
            '& .MuiAutocomplete-option:hover': {
              backgroundColor: flowVizTheme.colors.surface.hover,
            },
            '& .MuiAutocomplete-listbox': createScrollbarStyle(),
          },
        },
      }}
    />
  );
};

export default TechniqueAutocomplete;
