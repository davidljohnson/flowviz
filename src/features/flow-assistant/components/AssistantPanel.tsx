import { useEffect, useRef, useState } from 'react';
import { Box, Chip, CircularProgress, IconButton, InputBase, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AssistantMark from '../../../shared/components/icons/AssistantMark';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import { createScrollbarStyle, flowVizTheme } from '../../../shared/theme/flowviz-theme';
import { ChatMessage, OpResult } from '../types';
import type { SerializedContext } from '../services/graphContext';
import { TypeToken } from '../../flow-analysis/components/nodes/shared/NodeHeader';
import { trimStreamingTail } from '../services/markdown';
import { copyText } from '../services/clipboard';
import AssistantMarkdown from './AssistantMarkdown';

interface AssistantPanelProps {
  open: boolean;
  messages: ChatMessage[];
  pending: boolean;
  /** Whether the canvas has nodes; picks which suggested prompts show. */
  hasGraph: boolean;
  /** Pinned nodes/edges, resolved live against the graph. */
  contexts: SerializedContext[];
  /** How many nodes are on the canvas; the baseline chip states it. */
  nodeCount: number;
  onRemoveContext: (id: string) => void;
  onClearContexts: () => void;
  /** The in-flight reply's text as it streams; null until the answer starts. */
  streamingText: string | null;
  /** True while an analysis is streaming - input is held until it finishes. */
  disabled: boolean;
  onSend: (text: string) => void;
  onClear: () => void;
  onClose: () => void;
  /** Center the canvas on a node; [[id|label]] refs in replies use this. */
  onFocusNode?: (nodeId: string) => void;
  /** An inspector is open above: anchor below it so the two share the edge. */
  stacked?: boolean;
}

const bubbleSx = {
  px: 1.5,
  py: 1,
  // md, not lg: these nest inside a 12px panel, and nested radii step down.
  borderRadius: flowVizTheme.borderRadius.md,
  ...flowVizTheme.type.md,
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
};

/**
 * The assistant's own replies get no bubble. A 0.05 fill against the user's 0.10
 * is a distinction nobody can actually see, so both speakers just read as boxed;
 * dropping the box entirely is what makes "you asked, the app answered" legible,
 * and it takes a border off every reply.
 */
const assistantSx = {
  px: 0.5,
  py: 0.25,
  color: flowVizTheme.colors.text.primary,
  maxWidth: '96%',
};

/**
 * Panel-header controls, at the size the rest of the chrome uses.
 *
 * A fixed box rather than padding around the glyph, for the reason
 * ToolbarIconButton gives: derive the size from padding and it drifts the
 * moment an icon renders at a different step. That drift is exactly what
 * happened here — MUI's `small` padding around a 16px glyph produced 26, while
 * the inspector's 20px glyph produced 30, and `controlSize` claimed to be "the
 * height of every control in the chrome" while describing neither.
 */
const headerButtonSx = {
  width: flowVizTheme.controlSize,
  height: flowVizTheme.controlSize,
  p: 0,
  flexShrink: 0,
  color: flowVizTheme.colors.text.tertiary,
  '&.Mui-disabled': { color: flowVizTheme.colors.text.disabled },
};

/**
 * The neutral sibling of the node inspector's TypeToken: identical geometry
 * (28 box, radius at 0.29 of it, 16px glyph), without the type colour, which
 * on a node encodes something the assistant does not have.
 */
const assistantTokenSx = {
  width: flowVizTheme.controlSize,
  height: flowVizTheme.controlSize,
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: `${Math.round(flowVizTheme.controlSize * 0.29)}px`,
  backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.06)',
  border: '1px solid rgba(var(--fv-overlay-rgb), 0.1)',
  color: flowVizTheme.colors.text.primary,
};

/** Hover copy control for assistant replies; flashes a check on success. */
function CopyMessageButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip title={copied ? 'Copied' : 'Copy'}>
      <IconButton
        size="small"
        className="fv-copy"
        onClick={() => {
          copyText(text).then((ok) => {
            if (!ok) return;
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          p: 0.5,
          // 3.99:1 cleared the 3:1 bar for a control, but only just, and the
          // ladder has a step meant for it.
          color: flowVizTheme.colors.text.tertiary,
          backgroundColor: 'rgba(var(--fv-panel-rgb), 0.85)',
          opacity: 0,
          transition: flowVizTheme.motion.fast,
          '&:hover': { color: flowVizTheme.colors.text.primary, backgroundColor: 'rgba(var(--fv-panel-rgb), 0.95)' },
        }}
      >
        {copied ? <CheckIcon sx={{ fontSize: 13 }} /> : <ContentCopyIcon sx={{ fontSize: 13 }} />}
      </IconButton>
    </Tooltip>
  );
}

const GRAPH_SUGGESTIONS = [
  'Summarize this attack',
  'Draft Sigma rules for this attack',
  'Find coverage gaps in this flow',
];
// Three, like the graph set: a single chip reads as an orphan rather than as a
// choice.
const EMPTY_CANVAS_SUGGESTIONS = [
  'Build an example phishing attack flow',
  'Build a ransomware flow',
  'What can you do?',
];

function OpChips({ results }: { results: OpResult[] }) {
  if (results.length === 0) return null;
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
      {results.map((result) => (
        <Tooltip key={result.index} title={result.reason ?? ''} disableHoverListener={!result.reason}>
          <Chip
            size="small"
            label={result.status === 'skipped' ? `Skipped: ${result.summary}` : result.summary}
            sx={{
              height: 20,
              ...flowVizTheme.type.xs,
              backgroundColor: result.status === 'skipped'
                ? flowVizTheme.colors.status.warning.bg
                : 'rgba(var(--fv-overlay-rgb), 0.08)',
              color: result.status === 'skipped'
                ? flowVizTheme.colors.status.warning.text
                : 'rgba(var(--fv-overlay-rgb), 0.75)',
              border: result.status === 'skipped'
                ? `1px solid ${flowVizTheme.colors.status.warning.border}`
                : '1px solid rgba(var(--fv-overlay-rgb), 0.12)',
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        </Tooltip>
      ))}
    </Box>
  );
}

/** Shared chip geometry: 22 tall, one step below the 24 of the prompt chips. */
const chipBaseSx = {
  height: 22,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.625,
  borderRadius: flowVizTheme.borderRadius.sm,
  ...flowVizTheme.type.xs,
  flexShrink: 0,
  maxWidth: '100%',
};

/**
 * States the context the user never chose and cannot remove: the whole graph,
 * which goes up on every turn.
 *
 * Dashed and unremovable on purpose. A pinned chip is something you did; this
 * is something that is simply true, and the two must not look alike — without
 * it, a row of node chips reads as "the assistant can only see these", which is
 * the opposite of what happens.
 */
function BaselineChip({ nodeCount }: { nodeCount: number }) {
  return (
    <Tooltip title="The full graph is always sent. Pinned items add emphasis; they never narrow it.">
      <Box
        sx={{
          ...chipBaseSx,
          px: 0.875,
          border: '1px dashed rgba(var(--fv-overlay-rgb), 0.14)',
          color: flowVizTheme.colors.text.tertiary,
        }}
      >
        <AccountTreeIcon sx={{ fontSize: 11 }} />
        <Box component="span">Whole flow · {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}</Box>
      </Box>
    </Tooltip>
  );
}

/** One pinned node or edge, carrying its type colour and its own remove. */
function ContextChip({ context, onRemove }: { context: SerializedContext; onRemove: () => void }) {
  return (
    <Box
      sx={{
        ...chipBaseSx,
        pl: 0.5,
        pr: 0.25,
        backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.05)',
        border: '1px solid rgba(var(--fv-overlay-rgb), 0.12)',
        color: flowVizTheme.colors.text.secondary,
        transition: flowVizTheme.motion.fast,
        '&:hover': { borderColor: 'rgba(var(--fv-overlay-rgb), 0.28)' },
      }}
    >
      {/* The node card's own token, shrunk — the chip should read as the same
          object you clicked on the canvas, and colour is how the app says type. */}
      {context.kind === 'node' && context.nodeType
        ? <TypeToken nodeType={context.nodeType} size={14} />
        : <ArrowRightAltIcon sx={{ fontSize: 13, color: flowVizTheme.colors.text.tertiary }} />}
      <Tooltip title={context.name}>
        <Box
          component="span"
          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}
        >
          {context.name}
        </Box>
      </Tooltip>
      <IconButton
        size="small"
        onClick={onRemove}
        aria-label={`Remove ${context.name} from context`}
        sx={{
          p: 0,
          width: 16,
          height: 16,
          color: flowVizTheme.colors.text.tertiary,
          '&:hover': { color: flowVizTheme.colors.text.primary, backgroundColor: 'transparent' },
        }}
      >
        <CloseIcon sx={{ fontSize: 11 }} />
      </IconButton>
    </Box>
  );
}

/**
 * The row above the composer: what the assistant is being pointed at.
 *
 * Hidden entirely on an empty canvas — with no graph and nothing pinned there
 * is no context to describe, and an empty dashed chip is just chrome.
 */
function ContextRow({
  contexts,
  nodeCount,
  onRemove,
  onClear,
}: {
  contexts: SerializedContext[];
  nodeCount: number;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (nodeCount === 0 && contexts.length === 0) return null;
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.625, alignItems: 'center' }}>
      {nodeCount > 0 && <BaselineChip nodeCount={nodeCount} />}
      {contexts.map((context) => (
        <ContextChip key={context.id} context={context} onRemove={() => onRemove(context.id)} />
      ))}
      {/* Only once removing them one by one is the worse option. */}
      {contexts.length > 1 && (
        <Box
          component="button"
          onClick={onClear}
          sx={{
            ...flowVizTheme.type.xs,
            background: 'none',
            border: 'none',
            p: 0,
            ml: 0.25,
            cursor: 'pointer',
            color: flowVizTheme.colors.text.tertiary,
            transition: flowVizTheme.motion.fast,
            '&:hover': { color: flowVizTheme.colors.text.primary },
          }}
        >
          Clear
        </Box>
      )}
    </Box>
  );
}

/** The chips a sent message was asked with, above its text. */
function MessageContexts({ contexts }: { contexts: SerializedContext[] }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.625 }}>
      {contexts.map((context) => (
        <Box
          key={context.id}
          sx={{
            ...chipBaseSx,
            height: 18,
            px: 0.5,
            ...flowVizTheme.type.xs,
            backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.06)',
            border: '1px solid rgba(var(--fv-overlay-rgb), 0.12)',
            color: flowVizTheme.colors.text.tertiary,
          }}
        >
          {context.kind === 'node' && context.nodeType
            ? <TypeToken nodeType={context.nodeType} size={11} />
            : <ArrowRightAltIcon sx={{ fontSize: 11 }} />}
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
            {context.name}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/**
 * The AI graph assistant chat. Bottom-right on purpose: the node/edge
 * inspectors own the top-right corner, and keeping both visible lets the user
 * inspect a node while asking about it.
 */
export default function AssistantPanel({
  open,
  messages,
  pending,
  hasGraph,
  contexts,
  nodeCount,
  onRemoveContext,
  onClearContexts,
  streamingText,
  disabled,
  onSend,
  onClear,
  onClose,
  onFocusNode,
  stacked,
}: AssistantPanelProps) {
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState(() => localStorage.getItem('flowviz_assistant_expanded') === 'true');
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const toggleExpanded = () => {
    setExpanded(prev => {
      localStorage.setItem('flowviz_assistant_expanded', String(!prev));
      return !prev;
    });
  };

  // Keep the newest message (and the streaming tail) in view
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, pending, streamingText]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const canSend = !pending && !disabled && draft.trim().length > 0;

  const submit = () => {
    if (!canSend) return;
    onSend(draft);
    setDraft('');
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        // Base width matches the node inspector so the stacked pair reads as
        // one column; the wide reading mode only applies when standing alone
        width: !stacked && expanded ? 520 : 340,
        // Stacked under an open inspector the panel takes the rest of the
        // edge; alone it keeps its own height budget
        ...(stacked ? { top: '52%' } : { maxHeight: expanded ? '80%' : '60%' }),
        transition: `width ${flowVizTheme.motion.normal}`,
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
      {/* Header */}
      <Box
        sx={{
          px: 2,
          // Matches NodeInspector's header. The two stack into one column when
          // an inspector is open, and were meeting at different heights.
          pt: 1.75,
          pb: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid rgba(var(--fv-overlay-rgb), 0.06)',
        }}
      >
        {/* The mark gets the node inspector's token treatment — same 28 tile,
            same 0.29 radius ratio, same 16px glyph inside it. The two panels
            stack into one column, so their headers should share an anatomy:
            [anchor] [label] [actions]. Neutral rather than tinted, because the
            token's colour carries a node's type and the assistant has none.

            Still while a reply is in flight. It used to twinkle, which put two
            busy signals on screen at once — and unevenly: both ran while we
            waited for the first token, then the spinner row below was replaced
            by the reply and the twinkle carried on alone, so one animation
            meant "waiting" and then "still going". The spinner owns the state
            now, down where the answer actually arrives. */}
        <Box sx={assistantTokenSx}>
          <AssistantMark size={16} />
        </Box>
        <Typography sx={{ flex: 1, ...flowVizTheme.type.md, fontWeight: 600, color: flowVizTheme.colors.text.primary }}>
          Assistant
        </Typography>
        {/* Disabled rather than hidden when stacked: expanding only has an axis
            to move on when this panel owns the rail alone, and a control that
            vanishes as you select a node is its own kind of jitter. Disabled
            says "not here" where the old always-live button said "done" and
            then moved nothing. */}
        <Tooltip title={stacked ? 'Close the inspector to expand' : expanded ? 'Shrink panel' : 'Expand panel'}>
          <span>
            <IconButton size="small" onClick={toggleExpanded} disabled={stacked} sx={headerButtonSx}>
              {expanded ? <CloseFullscreenIcon sx={{ fontSize: 16 }} /> : <OpenInFullIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Clear conversation">
          <span>
            <IconButton size="small" onClick={onClear} disabled={messages.length === 0 || pending} sx={headerButtonSx}>
              <RestartAltIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Close">
          <IconButton size="small" onClick={onClose} sx={headerButtonSx}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Messages */}
      <Box ref={listRef} sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1, ...createScrollbarStyle() }}>
        {messages.length === 0 && !pending && (
          <>
            {/* The two quoted examples this used to carry are chips now, which
                is where an example you can click belongs. */}
            <Typography sx={{ color: flowVizTheme.colors.text.tertiary, ...flowVizTheme.type.sm, px: 0.5, py: 1 }}>
              Ask about the graph, or tell me to change it.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, px: 0.5 }}>
              {(hasGraph ? GRAPH_SUGGESTIONS : EMPTY_CANVAS_SUGGESTIONS).map((suggestion) => (
                <Chip
                  key={suggestion}
                  label={suggestion}
                  size="small"
                  disabled={disabled}
                  onClick={() => onSend(suggestion)}
                  sx={{
                    height: 24,
                    ...flowVizTheme.type.xs,
                    color: flowVizTheme.colors.text.secondary,
                    backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.05)',
                    border: '1px solid rgba(var(--fv-overlay-rgb), 0.12)',
                    '&:hover': { backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.1)', borderColor: 'rgba(var(--fv-overlay-rgb), 0.28)' },
                  }}
                />
              ))}
            </Box>
          </>
        )}
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
              ...bubbleSx,
              ...(message.role === 'user' && {
                backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.1)',
                border: '1px solid rgba(var(--fv-overlay-rgb), 0.16)',
                color: flowVizTheme.colors.text.primary,
              }),
              ...(message.role === 'assistant' && {
                ...assistantSx,
                position: 'relative' as const,
                '&:hover .fv-copy': { opacity: 1 },
              }),
              ...(message.role === 'error' && {
                backgroundColor: flowVizTheme.colors.status.error.bg,
                border: `1px solid ${flowVizTheme.colors.status.error.border}`,
                color: flowVizTheme.colors.status.error.text,
              }),
            }}
          >
            {message.role === 'user' && message.contexts && message.contexts.length > 0 && (
              <MessageContexts contexts={message.contexts} />
            )}
            {message.role === 'assistant'
              ? <AssistantMarkdown text={message.text} onFocusNode={onFocusNode} />
              : message.text}
            {message.role === 'assistant' && message.text && <CopyMessageButton text={message.text} />}
            {message.role === 'assistant' && <OpChips results={message.opResults ?? []} />}
          </Box>
        ))}
        {pending && (
          streamingText ? (
            <Box sx={{ alignSelf: 'flex-start', ...bubbleSx, ...assistantSx }}>
              <AssistantMarkdown text={trimStreamingTail(streamingText)} onFocusNode={onFocusNode} />
            </Box>
          ) : (
            <Box sx={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 1, ...bubbleSx, ...assistantSx }}>
              {/* Matches the "Thinking…" label beside it — the two are one
                  message and were drifting apart by 0.05. */}
              <CircularProgress size={14} sx={{ color: flowVizTheme.colors.text.tertiary }} />
              <Typography sx={{ ...flowVizTheme.type.sm, color: flowVizTheme.colors.text.tertiary }}>Thinking…</Typography>
            </Box>
          )
        )}
      </Box>

      {/* Composer */}
      <Tooltip title={disabled ? 'Wait for the analysis to finish' : ''} disableHoverListener={!disabled}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.875,
            px: 1.5,
            py: 1,
            borderTop: '1px solid rgba(var(--fv-overlay-rgb), 0.06)',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <ContextRow
            contexts={contexts}
            nodeCount={nodeCount}
            onRemove={onRemoveContext}
            onClear={onClearContexts}
          />
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5 }}>
          <InputBase
            inputRef={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask or edit…"
            multiline
            maxRows={4}
            disabled={disabled || pending}
            sx={{
              flex: 1,
              ...flowVizTheme.type.md,
              color: flowVizTheme.colors.text.primary,
              px: 1.25,
              py: 0.75,
              borderRadius: flowVizTheme.borderRadius.md,
              backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.04)',
              border: '1px solid rgba(var(--fv-overlay-rgb), 0.08)',
              transition: flowVizTheme.motion.fast,
              '&.Mui-focused': { borderColor: 'rgba(var(--fv-overlay-rgb), 0.3)' },
            }}
          />
          {/* Filled disc reads as the composer's one primary action - the
              inverted silver keeps it monochrome; grey while there is
              nothing to send */}
          <IconButton
            size="small"
            onClick={submit}
            disabled={!canSend}
            sx={{
              width: flowVizTheme.controlSize,
              height: flowVizTheme.controlSize,
              mb: 0.25,
              flexShrink: 0,
              backgroundColor: flowVizTheme.colors.inverse.surface,
              color: flowVizTheme.colors.inverse.text,
              transition: flowVizTheme.motion.fast,
              '&:hover': { backgroundColor: flowVizTheme.colors.inverse.surfaceHover },
              // 1.4.3 exempts disabled controls, so this was not a contrast
              // failure — but there is a token for exactly this state and it
              // resolves to the same weight, so there is no reason to hand-roll
              // it.
              '&.Mui-disabled': {
                backgroundColor: flowVizTheme.colors.surface.hover,
                color: flowVizTheme.colors.text.disabled,
              },
            }}
          >
            <ArrowUpwardIcon sx={{ fontSize: 16 }} />
          </IconButton>
          </Box>
        </Box>
      </Tooltip>
    </Box>
  );
}
