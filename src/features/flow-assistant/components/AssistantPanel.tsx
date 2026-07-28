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
import { createScrollbarStyle, flowVizTheme } from '../../../shared/theme/flowviz-theme';
import { ChatMessage, OpResult } from '../types';
import { trimStreamingTail } from '../services/markdown';
import { copyText } from '../services/clipboard';
import AssistantMarkdown from './AssistantMarkdown';

interface AssistantPanelProps {
  open: boolean;
  messages: ChatMessage[];
  pending: boolean;
  /** Whether the canvas has nodes; picks which suggested prompts show. */
  hasGraph: boolean;
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
  borderRadius: flowVizTheme.borderRadius.lg,
  fontSize: '0.82rem',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
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
const EMPTY_CANVAS_SUGGESTIONS = [
  'Build an example phishing attack flow',
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
              fontSize: '0.66rem',
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
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid rgba(var(--fv-overlay-rgb), 0.06)',
        }}
      >
        <AssistantMark size={19} />
        <Typography sx={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: flowVizTheme.colors.text.primary }}>
          AI Assistant
        </Typography>
        <Tooltip title={expanded ? 'Shrink panel' : 'Expand panel'}>
          <IconButton size="small" onClick={toggleExpanded} sx={{ color: flowVizTheme.colors.text.tertiary }}>
            {expanded ? <CloseFullscreenIcon sx={{ fontSize: 16 }} /> : <OpenInFullIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Clear conversation">
          <span>
            <IconButton size="small" onClick={onClear} disabled={messages.length === 0 || pending} sx={{ color: flowVizTheme.colors.text.tertiary }}>
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Close">
          <IconButton size="small" onClick={onClose} sx={{ color: flowVizTheme.colors.text.tertiary }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Messages */}
      <Box ref={listRef} sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1, ...createScrollbarStyle() }}>
        {messages.length === 0 && !pending && (
          <>
            {/* Body copy at 0.45 of the ink measured 2.94:1 on light. This is
                the first thing anyone reads in the panel. */}
            <Typography sx={{ color: flowVizTheme.colors.text.tertiary, fontSize: '0.78rem', px: 0.5, py: 1 }}>
              Ask about the graph or tell me to edit it — "add a C2 server connected to the loader", "delete the phishing node".
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
                    fontSize: '0.72rem',
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
                backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.05)',
                border: '1px solid rgba(var(--fv-overlay-rgb), 0.08)',
                color: flowVizTheme.colors.text.primary,
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
            {message.role === 'assistant'
              ? <AssistantMarkdown text={message.text} onFocusNode={onFocusNode} />
              : message.text}
            {message.role === 'assistant' && message.text && <CopyMessageButton text={message.text} />}
            {message.role === 'assistant' && <OpChips results={message.opResults ?? []} />}
          </Box>
        ))}
        {pending && (
          streamingText ? (
            <Box sx={{ alignSelf: 'flex-start', maxWidth: '90%', ...bubbleSx, backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.05)', border: '1px solid rgba(var(--fv-overlay-rgb), 0.08)', color: flowVizTheme.colors.text.primary }}>
              <AssistantMarkdown text={trimStreamingTail(streamingText)} onFocusNode={onFocusNode} />
            </Box>
          ) : (
            <Box sx={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 1, ...bubbleSx, backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.05)', border: '1px solid rgba(var(--fv-overlay-rgb), 0.08)' }}>
              {/* Matches the "Thinking…" label beside it — the two are one
                  message and were drifting apart by 0.05. */}
              <CircularProgress size={14} sx={{ color: flowVizTheme.colors.text.tertiary }} />
              <Typography sx={{ fontSize: '0.78rem', color: flowVizTheme.colors.text.tertiary }}>Thinking…</Typography>
            </Box>
          )
        )}
      </Box>

      {/* Composer */}
      <Tooltip title={disabled ? 'Wait for the analysis to finish' : ''} disableHoverListener={!disabled}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 0.5,
            px: 1.5,
            py: 1,
            borderTop: '1px solid rgba(var(--fv-overlay-rgb), 0.06)',
            opacity: disabled ? 0.5 : 1,
          }}
        >
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
              fontSize: '0.82rem',
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
              width: 30,
              height: 30,
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
      </Tooltip>
    </Box>
  );
}
