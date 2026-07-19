import { Box } from '@mui/material';
import { getBaseNodeStyle, getNodeSurfaceStyle, getNodeColor, NODE_BODY_BG } from './nodeStyles';
import { NodeHandles } from './NodeHandles';
import { NodeHeader } from './NodeHeader';
import { NodeContent } from './NodeContent';

interface NodeCardProps {
  data: any;
  selected: boolean;
  showTechniqueLink?: boolean;
  showCommandLine?: boolean;
  showTacticId?: boolean;
}

/**
 * Shared shell for the standard node types: a type-colored banner caps the
 * card (border tinted to match), with the title/description in a padded body
 * below. Operator nodes keep their own pill shape.
 */
export function NodeCard({ data, selected, showTechniqueLink, showCommandLine, showTacticId }: NodeCardProps) {
  const isNewNode = data.isNewNode;

  return (
    <Box
      className="fv-card"
      sx={{ ...getBaseNodeStyle(selected, isNewNode), '--fv-node-glow': `${getNodeColor(data.type)}4D` }}
    >
      <Box sx={getNodeSurfaceStyle(data.type, selected)}>
        <NodeHeader nodeType={data.type} />

        <Box sx={{ px: 1.75, py: 1.5, background: NODE_BODY_BG }}>
          <NodeContent
            data={data}
            showTechniqueLink={showTechniqueLink}
            showCommandLine={showCommandLine}
            showTacticId={showTacticId}
          />
        </Box>
      </Box>

      <NodeHandles />
    </Box>
  );
}
