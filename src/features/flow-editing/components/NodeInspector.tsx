import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  IconButton,
  InputBase,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssistantMark from '../../../shared/components/icons/AssistantMark';
import { Node } from 'reactflow';
import { flowVizTheme, createScrollbarStyle } from '../../../shared/theme/flowviz-theme';
import { NodeHeader } from '../../flow-analysis/components/nodes/shared/NodeHeader';
import { isAttackAction, isOperator, getMitreLink } from '../../flow-analysis/components/nodes/shared/nodeUtils';
import { AttackTechnique } from '../data/attackTechniques';
import TechniqueAutocomplete from './TechniqueAutocomplete';
import { labelSx, inputSx } from './inspectorFieldStyles';
import InspectorMenu, { InspectorMenuItem } from './InspectorMenu';
import NodeTypeList from './NodeTypeList';
import SegmentedControl from '../../../shared/components/SegmentedControl';
import { EditorNodeType, createDefaultNodeData } from '../utils/nodeFactoryDefaults';

interface NodeInspectorProps {
  node: Node;
  onChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  onClose: () => void;
  /** Clone this node; shown in the overflow menu when provided. */
  onDuplicate?: () => void;
  /** Open the source panel on this node's excerpt; menu item when provided. */
  onShowSource?: () => void;
  /** Open the AI assistant with this node as the selection. */
  onAskAssistant?: () => void;
  /** When true, the name field grabs focus on open (double-click / new node). */
  focusName?: boolean;
  /** When true, the notes field grabs focus on open (clicking a node's note glyph). */
  focusNotes?: boolean;
  /** The assistant is open below: cap height so the two share the right edge. */
  stacked?: boolean;
}

// Stored lowercase (exporters read the raw value); displayed capitalised.
const CONFIDENCE_OPTIONS = ['low', 'medium', 'high'] as const;
const CONFIDENCE_LABELS: Record<typeof CONFIDENCE_OPTIONS[number], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};


/**
 * Label + field wrapper. `action` rides beside the label rather than inside the
 * field: pinned to the field's right edge it stacked under the panel's close
 * button and read as panel chrome, and an input stretches to fill its box so
 * there is no way to sit an adornment against the text itself.
 */
const Field: React.FC<{ label: string; action?: React.ReactNode; children: React.ReactNode }> = ({ label, action, children }) => (
  <Box sx={{ mb: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: labelSx.mb }}>
      <Typography component="label" sx={{ ...labelSx, mb: 0 }}>{label}</Typography>
      {action}
    </Box>
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
        borderRadius: flowVizTheme.borderRadius.sm,
        backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.05)',
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
const NodeInspector: React.FC<NodeInspectorProps> = ({ node, onChange, onDelete, onClose, onDuplicate, onShowSource, onAskAssistant, focusName, focusNotes, stacked }) => {
  const data = node.data as Record<string, any>;
  const type = data.type as string;
  const nameRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);

  // The header is now a dark tint rather than a saturated slab, so its actions
  // (change-type, menu, close) read as light neutral icons — the color lives in
  // the type icon and the selected border, not here.
  const bannerInk = 'rgba(var(--fv-overlay-rgb), 0.6)';
  const bannerHover = 'rgba(var(--fv-overlay-rgb), 0.1)';

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

  // Opened by clicking a node's note glyph: land the cursor in the note, at the
  // end of any existing text, and bring it into view (it's the last field).
  useEffect(() => {
    if (focusNotes) {
      const t = setTimeout(() => {
        const el = notesRef.current;
        if (!el) return;
        el.focus();
        const end = el.value.length;
        el.setSelectionRange(end, end);
        el.scrollIntoView({ block: 'nearest' });
      }, 60);
      return () => clearTimeout(t);
    }
  }, [focusNotes, node.id]);

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

  const textField = (
    key: string,
    placeholder: string,
    opts?: { multiline?: boolean; mono?: boolean; inputRef?: React.Ref<HTMLInputElement> },
  ) => (
    <InputBase
      inputRef={opts?.inputRef}
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

  // Overflow-menu actions; each appears only when its capability is wired up
  const menuIconSx = { fontSize: '1rem' } as const;
  const techniqueId = typeof draft.technique_id === 'string' ? draft.technique_id.trim() : '';
  const menuItems: InspectorMenuItem[] = [
    ...(onDuplicate ? [{
      id: 'duplicate',
      label: 'Duplicate node',
      icon: <ContentCopyIcon sx={menuIconSx} />,
      onClick: onDuplicate,
    }] : []),
    ...(isAction && /^T\d{4}(\.\d{3})?$/.test(techniqueId) ? [{
      id: 'open-attack',
      label: 'Open in MITRE ATT&CK',
      icon: <OpenInNewIcon sx={menuIconSx} />,
      onClick: () => window.open(getMitreLink(techniqueId), '_blank', 'noopener'),
    }] : []),
    ...(onShowSource ? [{
      id: 'show-source',
      label: 'Show in source',
      icon: <MenuBookIcon sx={menuIconSx} />,
      onClick: onShowSource,
    }] : []),
    ...(onAskAssistant ? [{
      id: 'ask-assistant',
      label: 'Ask AI about this node',
      icon: <AssistantMark size={16} />,
      onClick: onAskAssistant,
    }] : []),
  ];

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 340,
        maxHeight: stacked ? '48%' : 'calc(100vh - 100px)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: flowVizTheme.zIndex.canvasPanel,
        backgroundColor: flowVizTheme.colors.background.panel,
        border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
        borderRadius: flowVizTheme.borderRadius.lg, // match the node corner radius
        boxShadow: flowVizTheme.effects.shadows.lg,
        overflow: 'hidden',
      }}
    >
      {/* Header zone — the type token + type name (doubling as the change-type
          control) with the panel actions, set off from the fields by a hairline.
          Mirrors the node card so the two read as the same object. */}
      <Box sx={{ px: 2, pt: 1.75, pb: 1.5, borderBottom: '1px solid rgba(var(--fv-overlay-rgb), 0.06)' }}>
        <NodeHeader
          nodeType={type}
          prominent
          onTypeClick={(e) => setTypeAnchor(e.currentTarget)}
          endSlot={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <InspectorMenu items={menuItems} deleteLabel="Delete node" onDelete={onDelete} ink={bannerInk} hoverBg={bannerHover} />
              <Tooltip title="Close (Esc)">
                <IconButton
                  onClick={onClose}
                  size="small"
                  className="node-details-close-button"
                  sx={{
                    color: bannerInk,
                    borderRadius: flowVizTheme.borderRadius.sm,
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
      </Box>

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
              border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
              borderRadius: flowVizTheme.borderRadius.md,
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
              fontSize: '1.15rem',
              fontWeight: 600,
              letterSpacing: '-0.015em',
              lineHeight: 1.3,
              mt: 0.5,
              mb: 2,
              px: 1,
              py: 0.75,
              borderRadius: flowVizTheme.borderRadius.md,
              border: '1px solid transparent',
              transition: flowVizTheme.motion.fast,
              '&:hover': { backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.03)' },
              '&.Mui-focused': {
                backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.05)',
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
            <Field
              label="MITRE Technique"
              action={/^T\d{4}(\.\d{3})?$/.test(techniqueId) ? (
                <Tooltip title="Open in MITRE ATT&CK">
                  <Box
                    component="a"
                    href={getMitreLink(techniqueId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open in MITRE ATT&CK"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      width: 18,
                      height: 18,
                      borderRadius: flowVizTheme.borderRadius.sm,
                      color: flowVizTheme.colors.text.tertiary,
                      transition: flowVizTheme.motion.fast,
                      '&:hover': {
                        color: flowVizTheme.colors.text.primary,
                        backgroundColor: flowVizTheme.colors.surface.hover,
                      },
                    }}
                  >
                    <OpenInNewIcon sx={{ fontSize: '0.8rem' }} />
                  </Box>
                </Tooltip>
              ) : undefined}
            >
              <TechniqueAutocomplete
                value={String(draft.technique_id ?? '')}
                onSelect={handleTechnique}
                onFreeText={(id) => { set('technique_id', id); commit('technique_id', id); }}
              />
            </Field>
          </>
        )}

        {/* Type-specific primary fields. Assets carry no extra field — a name
            and description is all an ATT&CK Flow asset is. */}
        {type === 'vulnerability' && (
          <Field label="CVE ID">{textField('cve_id', 'CVE-2024-...')}</Field>
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

        {/* Notes — the analyst's own annotation, set off from the node's data by
            a hairline. Every node type gets one. Local only: saved with the flow
            but never written to the STIX or Attack Flow exports. */}
        <Box sx={{ mt: 1, pt: 2.5, borderTop: `1px solid ${flowVizTheme.colors.surface.border.subtle}` }}>
          <Field label="Notes">
            {textField('notes', 'Add a note for yourself…', { multiline: true, inputRef: notesRef })}
          </Field>
        </Box>
      </Box>
    </Box>
  );
};

export default NodeInspector;
