import { Typography } from '@mui/material';
import { hasName } from './nodeUtils';
import { flowVizTheme } from '../../../../../shared/theme/flowviz-theme';

interface NodeContentProps {
  data: any;
  showCommandLine?: boolean;
}

// The card body under the type header: the node's name as the title, then the
// description, and an optional command-line preview. The tactic stays in the
// inspector - on the card it competed with the name for attention. The title
// wraps to two lines before it truncates, so a long name still reads (and
// exports) far better than a single clipped line.
export function NodeContent({
  data,
  showCommandLine = false
}: NodeContentProps) {
  const displayText = hasName(data) ? data.name : data.type;
  const description = typeof data.description === 'string' ? data.description.trim() : '';

  return (
    <>
      {/* Title (the node's name) */}
      <Typography
        variant="h6"
        component="div"
        sx={{
          color: 'rgba(var(--fv-overlay-rgb), 0.95)',
          mb: 0.5,
          fontSize: '0.92rem',
          fontWeight: 600,
          lineHeight: 1.3,
          letterSpacing: '-0.01em',
          wordBreak: 'break-word',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {displayText}
      </Typography>

      {/* Description */}
      {description && (
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(var(--fv-overlay-rgb), 0.6)',
            fontSize: '0.78rem',
            lineHeight: 1.45,
            mb: 1,
            wordBreak: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {description}
        </Typography>
      )}

      {/* Command line display for tool/malware nodes */}
      {showCommandLine && (data.type === 'tool' || data.type === 'malware') &&
       data.command_line && data.command_line.trim() && (
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(var(--fv-overlay-rgb), 0.75)',
            fontSize: '0.72rem',
            fontFamily: '"JetBrains Mono", Monaco, Consolas, "Courier New", monospace',
            lineHeight: 1.4,
            mb: 1,
            backgroundColor: flowVizTheme.colors.surface.recessedStrong,
            padding: '5px 8px',
            borderRadius: '6px',
            wordBreak: 'break-all',
            border: '1px solid rgba(var(--fv-overlay-rgb), 0.08)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {data.command_line}
        </Typography>
      )}
    </>
  );
}
