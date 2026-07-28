import React, { useEffect, useState } from 'react';
import { Box, IconButton, InputBase, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import EastRoundedIcon from '@mui/icons-material/EastRounded';
import { Edge, MarkerType } from 'reactflow';
import { flowVizTheme, createScrollbarStyle } from '../../../shared/theme/flowviz-theme';
import { useThemeMode } from '../../../shared/theme/ThemeModeProvider';
import InspectorMenu from './InspectorMenu';
import SegmentedControl from '../../../shared/components/SegmentedControl';
import {
  EDGE_DASH_ARRAY,
  EDGE_SHAPE_OPTIONS,
  EDGE_STYLE_OPTIONS,
  edgeColorNameFromStroke,
} from '../../../shared/components/edgeAppearance';
import EdgeColorSwatches from '../../../shared/components/EdgeColorSwatches';
import { labelSx, inputSx } from './inspectorFieldStyles';

// STIX-mappable verbs (kept in sync with EdgeLabelEditor).
const RELATIONSHIP_SUGGESTIONS = [
  'uses', 'targets', 'delivers', 'drops', 'downloads', 'exploits', 'hosts',
  'communicates with', 'controls', 'indicates', 'impersonates', 'leads to',
  'enables', 'requires', 'affects',
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
            <IconButton onClick={onClose} size="small" sx={{ width: flowVizTheme.controlSize, height: flowVizTheme.controlSize, p: 0, color: flowVizTheme.colors.text.tertiary, '&:hover': { color: flowVizTheme.colors.text.primary, backgroundColor: flowVizTheme.colors.surface.hover } }}>
              <CloseIcon sx={{ fontSize: 16 }} />
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

        <Field label="Shape">
          <SegmentedControl
            fullWidth
            aria-label="Shape"
            options={EDGE_SHAPE_OPTIONS}
            value={curve}
            onChange={(value) => onUpdateEdge(edge.id, { data: { curve: value } })}
          />
        </Field>

        <Field label="Style">
          <SegmentedControl
            fullWidth
            aria-label="Style"
            options={EDGE_STYLE_OPTIONS}
            value={dashed ? 'dashed' : 'solid'}
            onChange={(value) =>
              onUpdateEdge(edge.id, { style: { strokeDasharray: value === 'dashed' ? EDGE_DASH_ARRAY : undefined } })
            }
          />
        </Field>

        <Field label="Colour">
          <EdgeColorSwatches
            aria-label="Colour"
            mode={mode}
            value={edgeColorNameFromStroke(mode, stroke)}
            onChange={(color) => onUpdateEdge(edge.id, {
              style: { stroke: color.line },
              markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: color.arrow },
            })}
          />
        </Field>
      </Box>
    </Box>
  );
};

export default EdgeInspector;
