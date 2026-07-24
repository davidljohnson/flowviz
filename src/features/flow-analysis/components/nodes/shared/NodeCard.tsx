import { Box } from '@mui/material';
import { getBaseNodeStyle, getNodeSurfaceStyle, getNodeColor } from './nodeStyles';
import { NodeHandles } from './NodeHandles';
import { NodeHeader } from './NodeHeader';
import { NodeContent } from './NodeContent';
import { NoteBadge } from './NoteBadge';

interface NodeCardProps {
  data: any;
  selected: boolean;
  showTechniqueLink?: boolean;
  showCommandLine?: boolean;
  showTacticId?: boolean;
}

/**
 * Shared shell for the standard node types: the type header (token + type name)
 * caps the card, with the node's name as the title and the description below on
 * one unified surface.
 */
export function NodeCard({ data, selected, showCommandLine, showTacticId }: NodeCardProps) {
  const isNewNode = data.isNewNode;

  return (
    <Box
      className="fv-card"
      sx={{ ...getBaseNodeStyle(selected, isNewNode), '--fv-node-glow': `${getNodeColor(data.type)}4D` }}
    >
      <Box sx={getNodeSurfaceStyle(data.type, selected)}>
        <Box sx={{ px: 1.75, pt: 1.4, pb: 1.5, position: 'relative' }}>
          <NodeHeader nodeType={data.type} />

          <Box sx={{ mt: 1 }}>
            <NodeContent
              data={data}
              showCommandLine={showCommandLine}
              showTacticId={showTacticId}
            />
          </Box>

          <NoteBadge text={typeof data.notes === 'string' ? data.notes : ''} />
        </Box>
      </Box>

      <NodeHandles />
    </Box>
  );
}
