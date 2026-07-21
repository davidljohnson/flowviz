import React, { ComponentType, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Dialog, InputBase, Typography } from '@mui/material';
import { flowVizTheme, createScrollbarStyle } from '../../../shared/theme/flowviz-theme';

export interface Command {
  id: string;
  label: string;
  /** Right-aligned hint — a shortcut, or the current state of a toggle. */
  hint?: string;
  icon?: ComponentType<{ sx?: object }>;
  /** Extra words to match on, so search finds intent rather than just the label. */
  keywords?: string;
  disabled?: boolean;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

/**
 * ⌘K palette — one entry point for populating the canvas, whether that means
 * analysing a report or placing a node by hand. Deliberately the same shape as
 * the node-type picker (search, ↑/↓, ↵, Esc) so the two read as one idiom.
 */
const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, commands }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset per open — a stale query from last time is never what you want.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(t);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const usable = commands.filter(c => !c.disabled);
    if (!q) return usable;
    return usable.filter(c =>
      c.label.toLowerCase().includes(q) || (c.keywords ?? '').toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    setActive(a => Math.min(Math.max(a, 0), Math.max(results.length - 1, 0)));
  }, [results.length]);

  const choose = (i: number) => {
    const c = results[i];
    if (!c) return;
    onClose();
    c.run();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(a => (a + 1) % Math.max(results.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(a => (a - 1 + results.length) % Math.max(results.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(active);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      disableRestoreFocus
      // Sits high rather than dead-centre, so the list grows downward into
      // space instead of pushing the field around as results filter.
      sx={{ '& .MuiDialog-container': { alignItems: 'flex-start', pt: '14vh' } }}
      // PaperProps rather than slotProps.paper — this MUI major only accepts
      // the former on Dialog (Popover takes both, which is why the node picker
      // next door looks different).
      PaperProps={{
        sx: {
          width: 480,
          maxWidth: 'calc(100vw - 32px)',
          m: 0,
          backgroundColor: flowVizTheme.colors.menu.appBar,
          backdropFilter: flowVizTheme.effects.blur.heavy,
          border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
          borderRadius: `${flowVizTheme.borderRadius.lg}px`,
          boxShadow: flowVizTheme.effects.shadows.lg,
          overflow: 'hidden',
        },
      }}
    >
      <Box sx={{ px: 1.75, pt: 1.5, pb: 1.25, borderBottom: `1px solid ${flowVizTheme.colors.surface.border.subtle}` }}>
        <InputBase
          inputRef={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command…"
          fullWidth
          sx={{
            color: flowVizTheme.colors.text.primary,
            fontSize: '0.95rem',
            '& input::placeholder': { color: flowVizTheme.colors.text.tertiary, opacity: 1 },
          }}
        />
      </Box>

      <Box sx={{ py: 0.75, maxHeight: 340, overflowY: 'auto', ...createScrollbarStyle() }}>
        {results.length === 0 && (
          <Typography sx={{ px: 2, py: 1.25, fontSize: '0.85rem', color: flowVizTheme.colors.text.tertiary }}>
            No matching commands
          </Typography>
        )}
        {results.map((c, i) => {
          const Icon = c.icon;
          return (
            <Box
              key={c.id}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(i)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                mx: 0.75,
                px: 1.25,
                py: 0.85,
                borderRadius: `${flowVizTheme.borderRadius.sm}px`,
                cursor: 'pointer',
                color: i === active ? flowVizTheme.colors.text.primary : flowVizTheme.colors.text.secondary,
                backgroundColor: i === active ? flowVizTheme.colors.surface.hover : 'transparent',
              }}
            >
              {Icon && <Icon sx={{ fontSize: '1.05rem', color: 'inherit', opacity: 0.85 }} />}
              <Typography sx={{ fontSize: '0.88rem', color: 'inherit' }}>{c.label}</Typography>
              {c.hint && (
                <Typography
                  sx={{
                    ml: 'auto',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: flowVizTheme.colors.text.disabled,
                  }}
                >
                  {c.hint}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Dialog>
  );
};

export default CommandPalette;
