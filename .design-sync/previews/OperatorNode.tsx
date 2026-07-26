import { OperatorNode } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';
import { NodeFrame } from '../preview-lib/node';

/** The gate lozenge is sized by its own text, so it gets a narrow frame. */
const W = 120;

export const AndGate = () => (
  <Surface>
    <NodeFrame as={OperatorNode} width={W} data={{ type: 'AND_operator', name: 'All must succeed' }} />
  </Surface>
);

export const OrGate = () => (
  <Surface>
    <NodeFrame as={OperatorNode} width={W} data={{ type: 'OR_operator', name: 'Either path' }} />
  </Surface>
);

export const Selected = () => (
  <Surface>
    <NodeFrame as={OperatorNode} width={W} selected data={{ type: 'AND_operator', name: 'All must succeed' }} />
  </Surface>
);

/** The lozenge has no body, so its note badge perches on the top-right corner. */
export const WithNote = () => (
  <Surface>
    <NodeFrame
      as={OperatorNode}
      width={W}
      data={{
        type: 'OR_operator',
        name: 'Either path',
        notes: 'Reporting was ambiguous about which branch executed first.',
      }}
    />
  </Surface>
);

export const DarkAndLight = () => (
  <BothModes>
    <NodeFrame as={OperatorNode} width={W} data={{ type: 'AND_operator', name: 'All must succeed' }} />
  </BothModes>
);
