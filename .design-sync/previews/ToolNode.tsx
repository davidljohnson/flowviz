import { ToolNode } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';
import { NodeFrame } from '../preview-lib/node';

const powershell = {
  type: 'tool',
  name: 'PowerShell',
  description: 'Used to download and execute the second-stage loader in memory.',
  command_line: 'powershell -nop -w hidden -enc SQBFAFgAKABOAGUAdwAtAE8AYgBqAGUA',
};

/** ToolNode passes `showCommandLine`, so a tool card renders its invocation. */
export const WithCommandLine = () => (
  <Surface>
    <NodeFrame as={ToolNode} data={powershell} />
  </Surface>
);

export const NoCommandLine = () => (
  <Surface>
    <NodeFrame
      as={ToolNode}
      data={{
        type: 'tool',
        name: 'Mimikatz',
        description: 'Credential dumping utility staged on the domain controller.',
      }}
    />
  </Surface>
);

export const Selected = () => (
  <Surface>
    <NodeFrame as={ToolNode} data={powershell} selected />
  </Surface>
);

export const DarkAndLight = () => (
  <BothModes>
    <NodeFrame as={ToolNode} data={powershell} />
  </BothModes>
);
