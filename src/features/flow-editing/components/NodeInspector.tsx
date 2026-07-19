import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  IconButton,
  InputBase,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Node } from 'reactflow';
import { flowVizTheme, createScrollbarStyle } from '../../../shared/theme/flowviz-theme';
import { NodeHeader } from '../../flow-analysis/components/nodes/shared/NodeHeader';
import { isAttackAction, isOperator, getMitreLink } from '../../flow-analysis/components/nodes/shared/nodeUtils';
import { AttackTechnique } from '../data/attackTechniques';
import TechniqueAutocomplete from './TechniqueAutocomplete';

interface NodeInspectorProps {
  node: Node;
  onChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  onClose: () => void;
  /** When true, the name field grabs focus on open (double-click / new node). */
  focusName?: boolean;
}

const CONFIDENCE_OPTIONS = ['low', 'medium', 'high'] as const;

const INDICATOR_TYPES = [
  'ip-address',
  'domain',
  'file-hash',
  'url',
  'user-account',
  'registry-key',
  'network-port',
];

const labelSx = {
  display: 'block',
  color: flowVizTheme.colors.text.tertiary,
  fontSize: '0.68rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  mb: 0.75,
};

const inputSx = {
  width: '100%',
  color: flowVizTheme.colors.text.primary,
  fontSize: '0.85rem',
  lineHeight: 1.5,
  px: 1.25,
  py: 0.9,
  borderRadius: `${flowVizTheme.borderRadius.md}px`,
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
  transition: flowVizTheme.motion.fast,
  '&:hover': {
    border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
  },
  '&.Mui-focused': {
    border: `1px solid ${flowVizTheme.colors.surface.border.focus}`,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
};

/** Label + field wrapper. */
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Box sx={{ mb: 2 }}>
    <Typography component="label" sx={labelSx}>{label}</Typography>
    {children}
  </Box>
);

/** Small linkable metadata chip (tactic / technique). */
const Chip: React.FC<{ label: string; href?: string }> = ({ label, href }) => {
  if (!label) return null;
  const inner = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.5,
        borderRadius: `${flowVizTheme.borderRadius.sm}px`,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
        color: flowVizTheme.colors.text.secondary,
        fontSize: '0.72rem',
        fontWeight: 600,
        textDecoration: 'none',
        transition: flowVizTheme.motion.fast,
        '&:hover': href ? { color: flowVizTheme.colors.text.primary, borderColor: flowVizTheme.colors.surface.border.default } : {},
      }}
    >
      {label}
      {href && <OpenInNewIcon sx={{ fontSize: '0.75rem', opacity: 0.6 }} />}
    </Box>
  );
  return href
    ? <Box component="a" href={href} target="_blank" rel="noopener noreferrer" sx={{ textDecoration: 'none' }}>{inner}</Box>
    : inner;
};

/**
 * Right-hand inspector: the single, complete editor for a node. Every field
 * autosaves through the undoable updateNodeData op — text fields commit on
 * blur, selects/toggles on change. Reads live node data so it stays in sync
 * with undo/redo and canvas edits.
 */
const NodeInspector: React.FC<NodeInspectorProps> = ({ node, onChange, onDelete, onClose, focusName }) => {
  const data = node.data as Record<string, any>;
  const type = data.type as string;
  const nameRef = useRef<HTMLInputElement>(null);

  // Local draft keyed on node id; re-init when the selected node changes
  const [draft, setDraft] = useState<Record<string, any>>(data);
  useEffect(() => {
    setDraft(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  useEffect(() => {
    if (focusName) {
      const t = setTimeout(() => {
        nameRef.current?.focus();
        nameRef.current?.select();
      }, 60);
      return () => clearTimeout(t);
    }
  }, [focusName, node.id]);

  const set = (key: string, value: unknown) => setDraft(prev => ({ ...prev, [key]: value }));
  const commit = (key: string, value: unknown) => {
    if (data[key] === value) return;
    onChange({ [key]: value });
  };

  const handleTechnique = (technique: AttackTechnique | null) => {
    if (!technique) {
      setDraft(prev => ({ ...prev, technique_id: '', tactic_id: '', tactic_name: '' }));
      onChange({ technique_id: '', tactic_id: '', tactic_name: '' });
      return;
    }
    const tactic = technique.tactics[0];
    const patch = {
      technique_id: technique.id,
      tactic_id: tactic?.id ?? '',
      tactic_name: tactic?.name ?? '',
      name: String(draft.name || '').trim() ? draft.name : technique.name,
    };
    setDraft(prev => ({ ...prev, ...patch }));
    onChange(patch);
  };

  const textField = (key: string, placeholder: string, opts?: { multiline?: boolean; mono?: boolean }) => (
    <InputBase
      value={draft[key] ?? ''}
      placeholder={placeholder}
      multiline={opts?.multiline}
      minRows={opts?.multiline ? 2 : undefined}
      maxRows={opts?.multiline ? 8 : undefined}
      onChange={(e) => set(key, e.target.value)}
      onBlur={() => commit(key, typeof draft[key] === 'string' ? draft[key].trim() : draft[key])}
      sx={{
        ...inputSx,
        ...(opts?.mono && { fontFamily: '"JetBrains Mono", Monaco, Consolas, monospace', fontSize: '0.78rem' }),
      }}
    />
  );

  const isAction = isAttackAction(data);
  const isOp = isOperator(data);
  const tacticLabel = draft.tactic_name || draft.tactic_id;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 340,
        maxHeight: 'calc(100vh - 100px)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 12,
        backgroundColor: flowVizTheme.colors.background.glass,
        border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
        borderRadius: `${flowVizTheme.borderRadius.lg}px`,
        backdropFilter: flowVizTheme.effects.blur.heavy,
        boxShadow: flowVizTheme.effects.shadows.lg,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 2, pb: 1 }}>
        <NodeHeader nodeType={type} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Tooltip title="Delete node (Del)">
            <IconButton
              onClick={onDelete}
              size="small"
              sx={{
                color: flowVizTheme.colors.text.tertiary,
                borderRadius: `${flowVizTheme.borderRadius.sm}px`,
                transition: flowVizTheme.motion.fast,
                '&:hover': {
                  color: flowVizTheme.colors.status.error.text,
                  backgroundColor: flowVizTheme.colors.status.error.bg,
                },
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close (Esc)">
            <IconButton
              onClick={onClose}
              size="small"
              className="node-details-close-button"
              sx={{
                color: flowVizTheme.colors.text.tertiary,
                borderRadius: `${flowVizTheme.borderRadius.sm}px`,
                transition: flowVizTheme.motion.fast,
                '&:hover': {
                  color: flowVizTheme.colors.text.primary,
                  backgroundColor: flowVizTheme.colors.surface.hover,
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Scrollable body */}
      <Box sx={{ px: 2, pb: 2, overflowY: 'auto', ...createScrollbarStyle() }}>
        {/* Name — the hero field, borderless until focus */}
        {!isOp && (
          <InputBase
            inputRef={nameRef}
            value={draft.name ?? ''}
            placeholder="Untitled node"
            multiline
            onChange={(e) => set('name', e.target.value)}
            onBlur={() => commit('name', String(draft.name ?? '').trim())}
            sx={{
              width: '100%',
              color: flowVizTheme.colors.text.primary,
              fontSize: '1.05rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              lineHeight: 1.3,
              mt: 0.5,
              mb: 2,
              px: 1,
              py: 0.75,
              borderRadius: `${flowVizTheme.borderRadius.md}px`,
              border: '1px solid transparent',
              transition: flowVizTheme.motion.fast,
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.03)' },
              '&.Mui-focused': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${flowVizTheme.colors.surface.border.focus}`,
              },
            }}
          />
        )}

        {/* Operator gate toggle */}
        {isOp && (
          <Field label="Logic gate">
            <Box sx={{ display: 'flex', gap: 1 }}>
              {(['AND', 'OR'] as const).map(gate => {
                const active = (type === 'AND_operator' ? 'AND' : 'OR') === gate;
                return (
                  <Box
                    key={gate}
                    component="button"
                    onClick={() => onChange({ type: gate === 'AND' ? 'AND_operator' : 'OR_operator', operator: gate })}
                    sx={{
                      flex: 1,
                      cursor: 'pointer',
                      py: 1,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      borderRadius: `${flowVizTheme.borderRadius.md}px`,
                      color: active ? flowVizTheme.colors.text.primary : flowVizTheme.colors.text.tertiary,
                      backgroundColor: active ? flowVizTheme.colors.surface.active : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? flowVizTheme.colors.surface.border.focus : flowVizTheme.colors.surface.border.subtle}`,
                      transition: flowVizTheme.motion.fast,
                    }}
                  >
                    {gate}
                  </Box>
                );
              })}
            </Box>
          </Field>
        )}

        {/* Technique + tactic (actions) */}
        {isAction && (
          <>
            <Field label="MITRE Technique">
              <TechniqueAutocomplete
                value={String(draft.technique_id ?? '')}
                onSelect={handleTechnique}
                onFreeText={(id) => { set('technique_id', id); commit('technique_id', id); }}
              />
            </Field>
            {(tacticLabel || draft.technique_id) && (
              <Box sx={{ display: 'flex', gap: 1, mt: -1, mb: 2, flexWrap: 'wrap' }}>
                {tacticLabel && (
                  <Chip
                    href={draft.tactic_id ? `https://attack.mitre.org/tactics/${draft.tactic_id}/` : undefined}
                    label={`${draft.tactic_id ? draft.tactic_id + ': ' : ''}${draft.tactic_name || ''}`.trim()}
                  />
                )}
                {draft.technique_id && (
                  <Chip href={getMitreLink(String(draft.technique_id))} label={String(draft.technique_id)} />
                )}
              </Box>
            )}
          </>
        )}

        {/* Type-specific primary fields */}
        {type === 'vulnerability' && (
          <>
            <Field label="CVE ID">{textField('cve_id', 'CVE-2024-...')}</Field>
            <Field label="CVSS score">{textField('cvss_score', '0.0 – 10.0')}</Field>
          </>
        )}
        {type === 'asset' && (
          <>
            <Field label="Indicator type">
              <Box
                component="select"
                value={draft.indicator_type ?? ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { set('indicator_type', e.target.value); commit('indicator_type', e.target.value); }}
                sx={{ ...inputSx, appearance: 'auto', cursor: 'pointer', '& option': { color: '#000' } }}
              >
                <option value="">—</option>
                {INDICATOR_TYPES.map(t => <option key={t} value={t}>{t.replace('-', ' ')}</option>)}
              </Box>
            </Field>
            <Field label="Indicator value">{textField('indicator_value', 'e.g. 10.0.0.1', { mono: true })}</Field>
          </>
        )}
        {type === 'url' && (
          <Field label="URL / value">{textField('value', 'https://...', { mono: true })}</Field>
        )}
        {(type === 'tool' || type === 'malware') && (
          <Field label="Command line">{textField('command_line', 'e.g. powershell -enc ...', { mono: true })}</Field>
        )}

        {/* Description — everyone */}
        <Field label="Description">{textField('description', 'Add a description...', { multiline: true })}</Field>

        {/* Confidence (non-operator) */}
        {!isOp && (
          <Field label="Confidence">
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {CONFIDENCE_OPTIONS.map(level => {
                const active = draft.confidence === level;
                return (
                  <Box
                    key={level}
                    component="button"
                    onClick={() => { const next = active ? '' : level; set('confidence', next); commit('confidence', next); }}
                    sx={{
                      flex: 1,
                      cursor: 'pointer',
                      py: 0.6,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      borderRadius: `${flowVizTheme.borderRadius.sm}px`,
                      color: active ? flowVizTheme.colors.text.primary : flowVizTheme.colors.text.tertiary,
                      backgroundColor: active ? flowVizTheme.colors.surface.active : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? flowVizTheme.colors.surface.border.focus : flowVizTheme.colors.surface.border.subtle}`,
                      transition: flowVizTheme.motion.fast,
                    }}
                  >
                    {level}
                  </Box>
                );
              })}
            </Box>
          </Field>
        )}

        {/* Source excerpt (non-operator) */}
        {!isOp && (
          <Field label="Source text">{textField('source_excerpt', 'Quote from the source report...', { multiline: true })}</Field>
        )}
      </Box>
    </Box>
  );
};

export default NodeInspector;
