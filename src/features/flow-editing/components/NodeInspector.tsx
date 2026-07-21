import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  IconButton,
  InputBase,
  MenuItem,
  Popover,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Node } from 'reactflow';
import { flowVizTheme, createScrollbarStyle } from '../../../shared/theme/flowviz-theme';
import { NodeHeader } from '../../flow-analysis/components/nodes/shared/NodeHeader';
import { getNodeColor, getContrastText } from '../../flow-analysis/components/nodes/shared/nodeStyles';
import { isAttackAction, isOperator, getMitreLink } from '../../flow-analysis/components/nodes/shared/nodeUtils';
import { AttackTechnique } from '../data/attackTechniques';
import TechniqueAutocomplete from './TechniqueAutocomplete';
import InspectorMenu from './InspectorMenu';
import NodeTypeList from './NodeTypeList';
import SegmentedControl from '../../../shared/components/SegmentedControl';
import { EditorNodeType, createDefaultNodeData } from '../utils/nodeFactoryDefaults';

interface NodeInspectorProps {
  node: Node;
  onChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  onClose: () => void;
  /** When true, the name field grabs focus on open (double-click / new node). */
  focusName?: boolean;
}

// Stored lowercase (exporters read the raw value); displayed capitalised.
const CONFIDENCE_OPTIONS = ['low', 'medium', 'high'] as const;
const CONFIDENCE_LABELS: Record<typeof CONFIDENCE_OPTIONS[number], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const INDICATOR_TYPES = [
  'ip-address',
  'domain',
  'hostname',
  'url',
  'email-address',
  'file-hash',
  'file-path',
  'file-name',
  'mac-address',
  'user-account',
  'registry-key',
  'process',
  'mutex',
  'network-port',
  'autonomous-system',
  'certificate',
  'user-agent',
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

  // Ink + hover overlay for the actions that sit on the colored type banner.
  const bannerInk = getContrastText(getNodeColor(type));
  const bannerHover = bannerInk === '#ffffff' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.14)';

  // Anchor for the change-type switcher hung off the banner.
  const [typeAnchor, setTypeAnchor] = useState<HTMLElement | null>(null);

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

  /**
   * Re-type the node in place. Deliberately non-destructive: type-specific
   * fields are left in data rather than cleared, because the inspector renders
   * fields conditionally from one flat bag and the exporters switch on
   * data.type — so a stale cve_id on a Tool is simply never read, and a
   * Technique → Tool → Technique round-trip loses nothing. updateNodeData
   * mirrors a type patch onto node.type and commits it to the undo stack.
   */
  const handleTypeChange = (next: EditorNodeType) => {
    setTypeAnchor(null);
    if (next === type) return;

    const patch: Record<string, unknown> = { type: next };
    if (next === 'AND_operator' || next === 'OR_operator') {
      patch.operator = next === 'AND_operator' ? 'AND' : 'OR';
    }
    // Only refresh the name while it's still the placeholder the old type shipped
    // with — a name the user actually wrote is theirs to keep, even if it's now
    // hidden (operators don't show one).
    const currentName = String(draft.name ?? '').trim();
    const priorDefault = String(createDefaultNodeData(type as EditorNodeType)?.name ?? '');
    if (!currentName || currentName === priorDefault) {
      patch.name = createDefaultNodeData(next)?.name ?? '';
    }

    setDraft(prev => ({ ...prev, ...patch }));
    onChange(patch);
  };

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
        borderRadius: '10px', // match the node corner radius
        backdropFilter: flowVizTheme.effects.blur.heavy,
        boxShadow: flowVizTheme.effects.shadows.lg,
        overflow: 'hidden',
      }}
    >
      {/* Type banner — mirrors the node card's banner (corners clipped by the
          panel's overflow: hidden) so the inspector reads as the same object. */}
      <NodeHeader
        nodeType={type}
        prominent
        onTypeClick={(e) => setTypeAnchor(e.currentTarget)}
        endSlot={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <InspectorMenu deleteLabel="Delete node" onDelete={onDelete} ink={bannerInk} hoverBg={bannerHover} />
            <Tooltip title="Close (Esc)">
              <IconButton
                onClick={onClose}
                size="small"
                className="node-details-close-button"
                sx={{
                  color: bannerInk,
                  borderRadius: `${flowVizTheme.borderRadius.sm}px`,
                  transition: flowVizTheme.motion.fast,
                  '&:hover': { backgroundColor: bannerHover },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />

      {/* Change-type switcher — same list the add-node picker uses. */}
      <Popover
        open={Boolean(typeAnchor)}
        anchorEl={typeAnchor}
        onClose={() => setTypeAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              width: 236,
              backgroundColor: flowVizTheme.colors.menu.appBar,
              backdropFilter: flowVizTheme.effects.blur.heavy,
              border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
              borderRadius: `${flowVizTheme.borderRadius.md}px`,
              boxShadow: flowVizTheme.effects.shadows.lg,
              overflow: 'hidden',
            },
          },
        }}
      >
        <NodeTypeList
          placeholder="Change type…"
          selectedType={type as EditorNodeType}
          onChoose={handleTypeChange}
          onDismiss={() => setTypeAnchor(null)}
        />
      </Popover>

      {/* Scrollable body */}
      <Box sx={{ px: 2, pt: 2, pb: 2, overflowY: 'auto', ...createScrollbarStyle() }}>
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
            <SegmentedControl
              fullWidth
              aria-label="Logic gate"
              options={[{ value: 'AND', label: 'AND' }, { value: 'OR', label: 'OR' }]}
              value={type === 'AND_operator' ? 'AND' : 'OR'}
              onChange={(gate) =>
                onChange({ type: gate === 'AND' ? 'AND_operator' : 'OR_operator', operator: gate })
              }
            />
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
            <Field label="Type">
              <Select
                value={draft.indicator_type ?? ''}
                onChange={(e) => { set('indicator_type', e.target.value); commit('indicator_type', e.target.value); }}
                displayEmpty
                fullWidth
                MenuProps={{
                  PaperProps: {
                    sx: {
                      mt: 0.5,
                      backgroundColor: flowVizTheme.colors.menu.dialog,
                      backdropFilter: flowVizTheme.effects.blur.heavy,
                      border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
                      borderRadius: `${flowVizTheme.borderRadius.md}px`,
                      '& .MuiMenuItem-root': {
                        fontSize: '0.85rem',
                        color: flowVizTheme.colors.text.secondary,
                        '&:hover': { backgroundColor: flowVizTheme.colors.surface.hover },
                        '&.Mui-selected': {
                          backgroundColor: flowVizTheme.colors.surface.active,
                          '&:hover': { backgroundColor: flowVizTheme.colors.surface.hover },
                        },
                      },
                      '& .MuiList-root': createScrollbarStyle(),
                    },
                  },
                }}
                sx={{
                  color: flowVizTheme.colors.text.primary,
                  fontSize: '0.85rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: `${flowVizTheme.borderRadius.md}px`,
                  '& .MuiSelect-select': { py: 0.9, px: 1.25 },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: flowVizTheme.colors.surface.border.subtle },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: flowVizTheme.colors.surface.border.default },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: flowVizTheme.colors.surface.border.focus },
                  '& .MuiSelect-icon': { color: flowVizTheme.colors.text.tertiary },
                }}
              >
                <MenuItem value=""><Box component="span" sx={{ color: flowVizTheme.colors.text.tertiary }}>—</Box></MenuItem>
                {INDICATOR_TYPES.map(t => <MenuItem key={t} value={t}>{t.replace('-', ' ')}</MenuItem>)}
              </Select>
            </Field>
            <Field label="Value">{textField('indicator_value', 'e.g. 10.0.0.1', { mono: true })}</Field>
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
            <SegmentedControl
              fullWidth
              aria-label="Confidence"
              options={CONFIDENCE_OPTIONS.map(level => ({ value: level, label: CONFIDENCE_LABELS[level] }))}
              value={(draft.confidence as typeof CONFIDENCE_OPTIONS[number]) ?? ''}
              // Confidence is optional, so re-picking the active level clears it.
              onChange={(level) => {
                const next = draft.confidence === level ? '' : level;
                set('confidence', next);
                commit('confidence', next);
              }}
            />
          </Field>
        )}

        {/* Source excerpt (non-operator) */}
        {!isOp && (
          <Field label="Excerpt">{textField('source_excerpt', 'Quote from the source report...', { multiline: true })}</Field>
        )}

        {/* Source — link or citation for where this node came from */}
        {!isOp && (
          <Field label="Source">
            <>
              {textField('source_url', 'https://... or a citation')}
              {typeof draft.source_url === 'string' && /^https?:\/\//i.test(draft.source_url.trim()) && (
                <Box sx={{ mt: 1 }}>
                  <Chip href={draft.source_url.trim()} label="Open link" />
                </Box>
              )}
            </>
          </Field>
        )}
      </Box>
    </Box>
  );
};

export default NodeInspector;
