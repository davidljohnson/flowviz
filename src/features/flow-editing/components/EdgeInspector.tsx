import React, { useEffect, useState } from 'react';
import { Box, IconButton, InputBase, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import EastRoundedIcon from '@mui/icons-material/EastRounded';
import { Edge, MarkerType } from 'reactflow';
import { flowVizTheme, createScrollbarStyle, themePalettes, type ThemeMode } from '../../../shared/theme/flowviz-theme';
import { useThemeMode } from '../../../shared/theme/ThemeModeProvider';
import InspectorMenu from './InspectorMenu';
import SegmentedControl from '../../../shared/components/SegmentedControl';
import { labelSx, inputSx } from './inspectorFieldStyles';

// STIX-mappable verbs (kept in sync with EdgeLabelEditor).
const RELATIONSHIP_SUGGESTIONS = [
  'uses', 'targets', 'delivers', 'drops', 'downloads', 'exploits', 'hosts',
  'communicates with', 'controls', 'indicates', 'impersonates', 'leads to',
  'enables', 'requires', 'affects',
];

const CURVES = [
  { value: 'smooth', label: 'Curved' },
  { value: 'straight', label: 'Straight' },
  { value: 'step', label: 'Stepped' },
] as const;

// line = stroke color, arrow = opaque marker color so the line doesn't show
// through the arrowhead.
//
// The first two are neutrals drawn in whichever ink contrasts with the canvas,
// so they're built from the live palette rather than fixed: on a light canvas
// "mono" is graphite, not white. The named hues are the same in both themes.
const edgeColorOptions = (mode: ThemeMode) => {
  const { canvas } = themePalettes[mode].colors;
  return [
    { name: 'default', line: 'rgba(var(--fv-overlay-rgb), 0.55)', arrow: canvas.edgeArrow, swatch: 'rgba(var(--fv-overlay-rgb), 0.55)' },
    { name: 'mono', line: 'rgba(var(--fv-overlay-rgb), 0.9)', arrow: canvas.edgeArrowStrong, swatch: canvas.edgeArrowStrong },
    { name: 'blue', line: '#3b82f6', arrow: '#3b82f6', swatch: '#3b82f6' },
    { name: 'green', line: '#10b981', arrow: '#10b981', swatch: '#10b981' },
    { name: 'amber', line: '#f59e0b', arrow: '#f59e0b', swatch: '#f59e0b' },
    { name: 'red', line: '#ef4444', arrow: '#ef4444', swatch: '#ef4444' },
    { name: 'purple', line: '#8b5cf6', arrow: '#8b5cf6', swatch: '#8b5cf6' },
  ];
};

interface EdgeInspectorProps {
  edge: Edge;
  sourceLabel: string;
  targetLabel: string;
  onUpdateLabel: (edgeId: string, label: string) => void;
  onUpdateEdge: (edgeId: string, patch: { data?: Record<string, unknown>; style?: Record<string, unknown>; markerEnd?: unknown }) => void;
  onReverse: (edgeId: string) => void;
  onDelete: (edgeId: string) => void;
  onClose: () => void;
  /** The assistant is open below: cap height so the two share the right edge. */
  stacked?: boolean;
}


const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Box sx={{ mb: 2 }}>
    <Typography component="label" sx={labelSx}>{label}</Typography>
    {children}
  </Box>
);

/** Right-hand inspector for a selected edge — relationship, direction, and per-edge style. */
const EdgeInspector: React.FC<EdgeInspectorProps> = ({
  edge, sourceLabel, targetLabel, onUpdateLabel, onUpdateEdge, onReverse, onDelete, onClose, stacked,
}) => {
  const { mode } = useThemeMode();
  const [label, setLabel] = useState(typeof edge.label === 'string' ? edge.label : '');
  useEffect(() => {
    setLabel(typeof edge.label === 'string' ? edge.label : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edge.id]);

  const style = (edge.style ?? {}) as Record<string, unknown>;
  const curve = (edge.data?.curve as string) || 'smooth';
  const dashed = Boolean(style.strokeDasharray);
  const stroke = style.stroke as string | undefined;

  const commitLabel = () => onUpdateLabel(edge.id, label);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        // Same width as the node inspector and assistant: the right edge
        // reads as one column regardless of which surfaces are up
        width: 340,
        maxHeight: stacked ? '48%' : 'calc(100vh - 100px)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: flowVizTheme.zIndex.canvasPanel,
        backgroundColor: flowVizTheme.colors.background.panel,
        border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
        borderRadius: flowVizTheme.borderRadius.lg,
        boxShadow: flowVizTheme.effects.shadows.lg,
        overflow: 'hidden',
      }}
    >
      {/* Header: source -> target */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, borderBottom: `1px solid ${flowVizTheme.colors.surface.border.subtle}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, color: flowVizTheme.colors.text.secondary, fontSize: '0.82rem', fontWeight: 600 }}>
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 108 }}>{sourceLabel}</Box>
          <EastRoundedIcon sx={{ fontSize: '0.9rem', color: flowVizTheme.colors.text.tertiary, flexShrink: 0 }} />
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 108 }}>{targetLabel}</Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <InspectorMenu deleteLabel="Delete edge" onDelete={() => onDelete(edge.id)} />
          <Tooltip title="Close (Esc)">
            <IconButton onClick={onClose} size="small" sx={{ color: flowVizTheme.colors.text.tertiary, '&:hover': { color: flowVizTheme.colors.text.primary, backgroundColor: flowVizTheme.colors.surface.hover } }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ px: 2, py: 2, overflowY: 'auto', ...createScrollbarStyle() }}>
        <Field label="Relationship">
          <InputBase
            value={label}
            placeholder="e.g. uses"
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitLabel(); (e.target as HTMLInputElement).blur(); } }}
            sx={inputSx}
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            {RELATIONSHIP_SUGGESTIONS.map(s => (
              <Box
                key={s}
                component="button"
                onClick={() => { setLabel(s); onUpdateLabel(edge.id, s); }}
                sx={{
                  cursor: 'pointer', px: 1, py: 0.25, fontSize: '0.7rem',
                  borderRadius: flowVizTheme.borderRadius.sm,
                  color: label === s ? flowVizTheme.colors.text.primary : flowVizTheme.colors.text.tertiary,
                  backgroundColor: label === s ? flowVizTheme.colors.surface.active : 'rgba(var(--fv-overlay-rgb), 0.03)',
                  border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
                  transition: flowVizTheme.motion.fast,
                  '&:hover': { color: flowVizTheme.colors.text.primary },
                }}
              >
                {s}
              </Box>
            ))}
          </Box>
        </Field>

        <Field label="Direction">
          <Box
            component="button"
            onClick={() => onReverse(edge.id)}
            sx={{
              width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
              cursor: 'pointer', py: 0.75, fontSize: '0.8rem', fontWeight: 600,
              color: flowVizTheme.colors.text.secondary, backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.03)',
              border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`, borderRadius: flowVizTheme.borderRadius.md,
              transition: flowVizTheme.motion.fast,
              '&:hover': { color: flowVizTheme.colors.text.primary, borderColor: flowVizTheme.colors.surface.border.default },
            }}
          >
            <SwapHorizRoundedIcon sx={{ fontSize: '1rem' }} />
            Reverse arrow
          </Box>
        </Field>

        <Field label="Line shape">
          <SegmentedControl
            fullWidth
            aria-label="Line shape"
            options={CURVES.map(c => ({ value: c.value, label: c.label }))}
            value={curve}
            onChange={(value) => onUpdateEdge(edge.id, { data: { curve: value } })}
          />
        </Field>

        <Field label="Line style">
          <SegmentedControl
            fullWidth
            aria-label="Line style"
            options={[{ value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }]}
            value={dashed ? 'dashed' : 'solid'}
            onChange={(value) =>
              onUpdateEdge(edge.id, { style: { strokeDasharray: value === 'dashed' ? '5 5' : undefined } })
            }
          />
        </Field>

        <Field label="Color">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {edgeColorOptions(mode).map(c => {
              const active = stroke === c.line;
              return (
                <Box
                  key={c.name}
                  component="button"
                  title={c.name}
                  onClick={() => onUpdateEdge(edge.id, { style: { stroke: c.line }, markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: c.arrow } })}
                  sx={{
                    width: 26, height: 26, p: 0, cursor: 'pointer', borderRadius: flowVizTheme.borderRadius.circle,
                    backgroundColor: c.swatch,
                    border: `2px solid ${active ? 'rgba(var(--fv-overlay-rgb), 0.95)' : 'rgba(var(--fv-overlay-rgb), 0.15)'}`,
                    boxShadow: active ? '0 0 0 2px rgba(var(--fv-overlay-rgb), 0.2)' : 'none',
                    transition: flowVizTheme.motion.fast,
                  }}
                />
              );
            })}
          </Box>
        </Field>
      </Box>
    </Box>
  );
};

export default EdgeInspector;
