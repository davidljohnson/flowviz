import React, { useEffect, useState } from 'react';
import { Box, IconButton, InputBase, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import EastRoundedIcon from '@mui/icons-material/EastRounded';
import { Edge, MarkerType } from 'reactflow';
import { flowVizTheme, createScrollbarStyle } from '../../../shared/theme/flowviz-theme';
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
const EDGE_COLORS = [
  { name: 'default', line: 'rgba(255, 255, 255, 0.55)', arrow: 'rgb(150, 153, 158)', swatch: 'rgba(255, 255, 255, 0.55)' },
  { name: 'white', line: 'rgba(255, 255, 255, 0.9)', arrow: 'rgb(224, 227, 232)', swatch: '#e0e3e8' },
  { name: 'blue', line: '#3b82f6', arrow: '#3b82f6', swatch: '#3b82f6' },
  { name: 'green', line: '#10b981', arrow: '#10b981', swatch: '#10b981' },
  { name: 'amber', line: '#f59e0b', arrow: '#f59e0b', swatch: '#f59e0b' },
  { name: 'red', line: '#ef4444', arrow: '#ef4444', swatch: '#ef4444' },
  { name: 'purple', line: '#8b5cf6', arrow: '#8b5cf6', swatch: '#8b5cf6' },
];

interface EdgeInspectorProps {
  edge: Edge;
  sourceLabel: string;
  targetLabel: string;
  onUpdateLabel: (edgeId: string, label: string) => void;
  onUpdateEdge: (edgeId: string, patch: { data?: Record<string, unknown>; style?: Record<string, unknown>; markerEnd?: unknown }) => void;
  onReverse: (edgeId: string) => void;
  onDelete: (edgeId: string) => void;
  onClose: () => void;
}


const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Box sx={{ mb: 2 }}>
    <Typography component="label" sx={labelSx}>{label}</Typography>
    {children}
  </Box>
);

/** Right-hand inspector for a selected edge — relationship, direction, and per-edge style. */
const EdgeInspector: React.FC<EdgeInspectorProps> = ({
  edge, sourceLabel, targetLabel, onUpdateLabel, onUpdateEdge, onReverse, onDelete, onClose,
}) => {
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
        width: 320,
        maxHeight: 'calc(100vh - 100px)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 12,
        backgroundColor: flowVizTheme.colors.background.glass,
        border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
        borderRadius: '10px',
        backdropFilter: flowVizTheme.effects.blur.heavy,
        boxShadow: flowVizTheme.effects.shadows.lg,
        overflow: 'hidden',
      }}
    >
      {/* Header: source -> target */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, borderBottom: `1px solid ${flowVizTheme.colors.surface.border.subtle}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0, color: flowVizTheme.colors.text.secondary, fontSize: '0.82rem', fontWeight: 600 }}>
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
                  cursor: 'pointer', px: 0.9, py: 0.35, fontSize: '0.7rem',
                  borderRadius: `${flowVizTheme.borderRadius.sm}px`,
                  color: label === s ? flowVizTheme.colors.text.primary : flowVizTheme.colors.text.tertiary,
                  backgroundColor: label === s ? flowVizTheme.colors.surface.active : 'rgba(255, 255, 255, 0.03)',
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
              cursor: 'pointer', py: 0.8, fontSize: '0.8rem', fontWeight: 600,
              color: flowVizTheme.colors.text.secondary, backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`, borderRadius: `${flowVizTheme.borderRadius.md}px`,
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
            {EDGE_COLORS.map(c => {
              const active = stroke === c.line;
              return (
                <Box
                  key={c.name}
                  component="button"
                  title={c.name}
                  onClick={() => onUpdateEdge(edge.id, { style: { stroke: c.line }, markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: c.arrow } })}
                  sx={{
                    width: 26, height: 26, p: 0, cursor: 'pointer', borderRadius: '50%',
                    backgroundColor: c.swatch,
                    border: `2px solid ${active ? '#fff' : 'rgba(255, 255, 255, 0.15)'}`,
                    boxShadow: active ? '0 0 0 2px rgba(255, 255, 255, 0.2)' : 'none',
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
