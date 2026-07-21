import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, InputBase, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { flowVizTheme, createScrollbarStyle } from '../../../shared/theme/flowviz-theme';
import { getNodeColor } from '../../flow-analysis/components/nodes/shared/nodeStyles';
import { EditorNodeType, NODE_TYPE_LABELS } from '../utils/nodeFactoryDefaults';

const PICKER_ORDER: EditorNodeType[] = [
  'action',
  'tool',
  'malware',
  'asset',
  'infrastructure',
  'url',
  'vulnerability',
  'AND_operator',
  'OR_operator',
];

// Extra keywords so search matches intent, not just the visible label
// (e.g. "mitre" → Technique, "c2" → Infrastructure).
const KEYWORDS: Partial<Record<EditorNodeType, string>> = {
  action: 'mitre attack technique ttp',
  infrastructure: 'c2 server domain ip',
  url: 'link web address',
  vulnerability: 'cve exploit',
  AND_operator: 'gate logic and',
  OR_operator: 'gate logic or',
};

interface NodeTypeListProps {
  onChoose: (type: EditorNodeType) => void;
  onDismiss: () => void;
  /** Search-field prompt — states what picking does ("Add node…" / "Change type…"). */
  placeholder: string;
  /** Ticked and pre-focused when reopened; set when re-typing an existing node. */
  selectedType?: EditorNodeType;
}

/**
 * The searchable type list itself, with no opinion on how it's anchored. Shared
 * by the add-node picker and the inspector's change-type switcher so both read
 * as the same control: type to filter, ↑/↓ to move, ↵ to pick, Esc to dismiss.
 */
const NodeTypeList: React.FC<NodeTypeListProps> = ({ onChoose, onDismiss, placeholder, selectedType }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = PICKER_ORDER.map(type => ({ type, label: NODE_TYPE_LABELS[type] }));
    if (!q) return items;
    return items.filter(({ type, label }) =>
      label.toLowerCase().includes(q) ||
      type.toLowerCase().includes(q) ||
      (KEYWORDS[type] ?? '').includes(q)
    );
  }, [query]);

  // Start on the current type when re-typing, so ↵ is a no-op rather than a
  // surprise change; start at the top when adding.
  const [active, setActive] = useState(() => {
    const i = selectedType ? PICKER_ORDER.indexOf(selectedType) : 0;
    return i < 0 ? 0 : i;
  });

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(t);
  }, []);

  // Keep the active index in range as results shrink/grow
  useEffect(() => {
    setActive(a => Math.min(Math.max(a, 0), Math.max(results.length - 1, 0)));
  }, [results.length]);

  const choose = (i: number) => {
    const r = results[i];
    if (r) onChoose(r.type);
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
      onDismiss();
    }
  };

  return (
    <>
      {/* Search field */}
      <Box sx={{ px: 1.25, pt: 1, pb: 0.75, borderBottom: `1px solid ${flowVizTheme.colors.surface.border.subtle}` }}>
        <InputBase
          inputRef={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          fullWidth
          sx={{
            color: flowVizTheme.colors.text.primary,
            fontSize: '0.85rem',
            '& input::placeholder': { color: flowVizTheme.colors.text.tertiary, opacity: 1 },
          }}
        />
      </Box>

      {/* Results */}
      <Box sx={{ py: 0.5, maxHeight: 280, overflowY: 'auto', ...createScrollbarStyle() }}>
        {results.length === 0 && (
          <Typography sx={{ px: 1.5, py: 1, fontSize: '0.8rem', color: flowVizTheme.colors.text.tertiary }}>
            No matches
          </Typography>
        )}
        {results.map((r, i) => (
          <Box
            key={r.type}
            onMouseEnter={() => setActive(i)}
            onClick={() => choose(i)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mx: 0.5,
              px: 1,
              py: 0.6,
              borderRadius: `${flowVizTheme.borderRadius.sm}px`,
              cursor: 'pointer',
              color: i === active ? flowVizTheme.colors.text.primary : flowVizTheme.colors.text.secondary,
              backgroundColor: i === active ? flowVizTheme.colors.surface.hover : 'transparent',
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                flexShrink: 0,
                backgroundColor: getNodeColor(r.type),
                boxShadow: i === active ? `0 0 6px ${getNodeColor(r.type)}66` : 'none',
              }}
            />
            <Typography sx={{ fontSize: '0.85rem', color: 'inherit' }}>{r.label}</Typography>
            {selectedType === r.type && (
              <CheckRoundedIcon sx={{ ml: 'auto', fontSize: '0.95rem', color: flowVizTheme.colors.text.tertiary }} />
            )}
          </Box>
        ))}
      </Box>
    </>
  );
};

export default NodeTypeList;
