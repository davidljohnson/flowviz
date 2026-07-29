import { Box } from '@mui/material';
import { getBaseNodeStyle, getNodeSurfaceStyle, getNodeColor } from './nodeStyles';
import { useDetailState } from './presentationScale';
import { NodeHandles } from './NodeHandles';
import { NodeHeader } from './NodeHeader';
import { NodeContent } from './NodeContent';
import { NoteBadge } from './NoteBadge';

interface NodeCardProps {
  data: any;
  selected: boolean;
  showTechniqueLink?: boolean;
  showCommandLine?: boolean;
}

/**
 * Shared shell for the standard node types: the type header (token + type name)
 * caps the card, with the node's name as the title and the description below on
 * one unified surface.
 */
export function NodeCard({ data, selected, showCommandLine }: NodeCardProps) {
  const isNewNode = data.isNewNode;
  const techniqueId = typeof data.technique_id === 'string' ? data.technique_id.trim() : '';
  const { tier, pinned } = useDetailState();

  return (
    <Box
      className="fv-card"
      sx={{ ...getBaseNodeStyle(selected, isNewNode), '--fv-node-glow': `${getNodeColor(data.type)}4D` }}
    >
      <Box sx={getNodeSurfaceStyle(data.type, selected, tier, pinned)}>
        {/*
          Faded, never unmounted. At `token` the text is a few pixels tall and
          reads as grey noise competing with the colour that has taken over the
          card — but the card is sized by its contents (minWidth 210, height
          from the text), so removing them would resize every node and shift the
          layout mid-zoom. Opacity costs nothing and holds the geometry still.
        */}
        <Box
          sx={{
            px: 1.75,
            pt: 1.5,
            pb: 1.5,
            position: 'relative',
            opacity: tier === 'token' ? 0 : 1,
            transition: pinned ? 'none' : 'opacity 180ms ease',
          }}
        >
          <NodeHeader nodeType={data.type} techniqueId={techniqueId || undefined} />

          <Box sx={{ mt: 1 }}>
            <NodeContent
              data={data}
              showCommandLine={showCommandLine}
            />
          </Box>

          <NoteBadge text={typeof data.notes === 'string' ? data.notes : ''} />
        </Box>
      </Box>

      <NodeHandles />
    </Box>
  );
}
