import { useState } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { InlineToken, parseMarkdown } from '../services/markdown';
import { copyText } from '../services/clipboard';
import { flowVizTheme } from '../../../shared/theme/flowviz-theme';

interface AssistantMarkdownProps {
  text: string;
  /** Focus a node on the canvas; [[id|label]] refs render as links when set. */
  onFocusNode?: (nodeId: string) => void;
}

const codeSx = {
  fontFamily: '"JetBrains Mono", Monaco, Consolas, monospace',
  fontSize: '0.76rem',
  px: 0.5,
  py: 0.25,
  borderRadius: flowVizTheme.borderRadius.xs,
  backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.08)',
};

function Inline({ tokens, onFocusNode }: { tokens: InlineToken[]; onFocusNode?: (id: string) => void }) {
  return (
    <>
      {tokens.map((token, i) => {
        switch (token.kind) {
          case 'bold':
            return <Box key={i} component="strong" sx={{ fontWeight: 700, color: 'rgba(var(--fv-overlay-rgb), 0.95)' }}>{token.text}</Box>;
          case 'italic':
            return <Box key={i} component="em">{token.text}</Box>;
          case 'code':
            return <Box key={i} component="code" sx={codeSx}>{token.text}</Box>;
          case 'noderef':
            return (
              <Box
                key={i}
                component="span"
                role={onFocusNode ? 'button' : undefined}
                onClick={onFocusNode ? () => onFocusNode(token.id) : undefined}
                sx={{
                  color: 'rgba(var(--fv-overlay-rgb), 0.92)',
                  cursor: onFocusNode ? 'pointer' : 'inherit',
                  textDecorationLine: 'underline',
                  textDecorationColor: 'rgba(var(--fv-overlay-rgb), 0.35)',
                  textUnderlineOffset: '2px',
                  '&:hover': onFocusNode ? { textDecorationColor: 'rgba(var(--fv-overlay-rgb), 0.9)' } : undefined,
                }}
              >
                {token.label}
              </Box>
            );
          default:
            return <span key={i}>{token.text}</span>;
        }
      })}
    </>
  );
}

/**
 * A fenced block (Sigma rules, hunting queries) with its own copy control -
 * these are written to be pasted into a SIEM, not read in the chat.
 */
function CodeBlock({ lang, text }: { lang: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Box
      sx={{
        borderRadius: flowVizTheme.borderRadius.md,
        border: '1px solid rgba(var(--fv-overlay-rgb), 0.08)',
        backgroundColor: flowVizTheme.colors.surface.recessedStrong,
        overflow: 'hidden',
      }}
    >
      {/* Header strip keeps the chrome out of the code's way entirely */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          pl: 1.25,
          pr: 0.5,
          py: 0.25,
          borderBottom: '1px solid rgba(var(--fv-overlay-rgb), 0.06)',
        }}
      >
        <Box sx={{ flex: 1, fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(var(--fv-overlay-rgb), 0.35)' }}>
          {lang || 'code'}
        </Box>
        <Tooltip title={copied ? 'Copied' : 'Copy'}>
          <IconButton
            size="small"
            onClick={() => {
              copyText(text).then((ok) => {
                if (!ok) return;
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            sx={{
              p: 0.5,
              color: 'rgba(var(--fv-overlay-rgb), 0.45)',
              transition: '0.15s',
              '&:hover': { color: 'rgba(var(--fv-overlay-rgb), 0.9)' },
            }}
          >
            {copied ? <CheckIcon sx={{ fontSize: 13 }} /> : <ContentCopyIcon sx={{ fontSize: 13 }} />}
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        component="pre"
        sx={{
          m: 0,
          px: 1.25,
          py: 1,
          fontFamily: '"JetBrains Mono", Monaco, Consolas, monospace',
          fontSize: '0.72rem',
          lineHeight: 1.55,
          color: 'rgba(var(--fv-overlay-rgb), 0.82)',
          overflowX: 'auto',
          whiteSpace: 'pre',
        }}
      >
        {text}
      </Box>
    </Box>
  );
}

/** Renders the subset of markdown the assistant is allowed to emit. */
export default function AssistantMarkdown({ text, onFocusNode }: AssistantMarkdownProps) {
  const blocks = parseMarkdown(text);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {blocks.map((block, i) => {
        if (block.kind === 'heading') {
          return (
            <Typography key={i} sx={{ fontSize: '0.84rem', fontWeight: 700, color: 'rgba(var(--fv-overlay-rgb), 0.95)', mt: i === 0 ? 0 : 0.5 }}>
              <Inline tokens={block.inline} onFocusNode={onFocusNode} />
            </Typography>
          );
        }
        if (block.kind === 'codeblock') {
          return <CodeBlock key={i} lang={block.lang} text={block.text} />;
        }
        if (block.kind === 'list') {
          return (
            <Box key={i} component={block.ordered ? 'ol' : 'ul'} sx={{ m: 0, pl: 2.25, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              {block.items.map((item, j) => (
                <Box key={j} component="li" sx={{ fontSize: 'inherit', lineHeight: 'inherit' }}>
                  <Inline tokens={item} onFocusNode={onFocusNode} />
                </Box>
              ))}
            </Box>
          );
        }
        return (
          <Typography key={i} sx={{ fontSize: 'inherit', lineHeight: 'inherit', whiteSpace: 'pre-wrap' }}>
            <Inline tokens={block.inline} onFocusNode={onFocusNode} />
          </Typography>
        );
      })}
    </Box>
  );
}
