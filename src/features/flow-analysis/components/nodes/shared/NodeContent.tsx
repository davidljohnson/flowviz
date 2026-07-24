import { Box, Typography } from '@mui/material';
import { hasName, isAttackAction } from './nodeUtils';
import { TACTIC_NAMES } from '../../constants';

interface NodeContentProps {
  data: any;
  showCommandLine?: boolean;
  showTacticId?: boolean;
}

// The card body under the type header: the node's name as the title, then the
// description, an optional command-line preview, and the tactic beat for
// techniques. The title wraps to two lines before it truncates, so a long name
// still reads (and exports) far better than a single clipped line.
export function NodeContent({
  data,
  showCommandLine = false,
  showTacticId = false
}: NodeContentProps) {
  const displayText = hasName(data) ? data.name : data.type;
  const tacticLabel = data.tactic_name || TACTIC_NAMES[data.tactic_id] || data.tactic_id;
  const description = typeof data.description === 'string' ? data.description.trim() : '';

  return (
    <>
      {/* Title (the node's name) */}
      <Typography
        variant="h6"
        component="div"
        sx={{
          color: 'rgba(255, 255, 255, 0.95)',
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
            color: 'rgba(255, 255, 255, 0.6)',
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
            color: 'rgba(255, 255, 255, 0.75)',
            fontSize: '0.72rem',
            fontFamily: '"JetBrains Mono", Monaco, Consolas, "Courier New", monospace',
            lineHeight: 1.4,
            mb: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            padding: '5px 8px',
            borderRadius: '6px',
            wordBreak: 'break-all',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {data.command_line}
        </Typography>
      )}

      {/* Tactic footer for attack actions */}
      {showTacticId && isAttackAction(data) && tacticLabel && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
          <Box
            component="span"
            sx={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.35)',
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.45)',
              fontSize: '0.68rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {tacticLabel}
          </Typography>
        </Box>
      )}
    </>
  );
}
