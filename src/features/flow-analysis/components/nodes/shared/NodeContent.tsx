import { Box, Typography, Link, Tooltip } from '@mui/material';
import { getTextStyle, getMitreLink, hasDescription, hasName, isAttackAction } from './nodeUtils';
import { TACTIC_NAMES } from '../../constants';

interface NodeContentProps {
  data: any;
  showTechniqueLink?: boolean;
  showCommandLine?: boolean;
  showTacticId?: boolean;
}

export function NodeContent({
  data,
  showTechniqueLink = false,
  showCommandLine = false,
  showTacticId = false
}: NodeContentProps) {
  const displayText = hasName(data) ? data.name : data.type;
  const { text, style } = getTextStyle(displayText);
  const tacticLabel = data.tactic_name || TACTIC_NAMES[data.tactic_id] || data.tactic_id;

  return (
    <>
      {/* Node Name/Title */}
      <Tooltip
        title={displayText}
        placement="top"
        disableInteractive
      >
        <Typography variant="h6" component="div" sx={{
          color: 'rgba(255, 255, 255, 0.95)',
          mb: 0.75,
          fontSize: '0.9rem',
          fontWeight: 600,
          lineHeight: 1.35,
          letterSpacing: '-0.01em',
          maxWidth: '220px',
          ...style
        }}>
          {text}
          {showTechniqueLink && isAttackAction(data) && data.technique_id && data.technique_id !== data.name && (
            <Link
              href={getMitreLink(data.technique_id)}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                ml: 0.75,
                color: 'rgba(255, 255, 255, 0.45)',
                fontSize: '0.75rem',
                fontWeight: 500,
                textDecoration: 'none',
                '&:hover': {
                  color: '#fff',
                  textDecoration: 'underline'
                }
              }}
            >
              {data.technique_id}
            </Link>
          )}
        </Typography>
      </Tooltip>

      {/* Description */}
      {hasDescription(data) && (
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.78rem',
            lineHeight: 1.45,
            mb: 1,
            wordBreak: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {data.description}
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
