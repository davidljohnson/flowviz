import { NodeCard } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';

/**
 * NodeCard is the shared shell the standard node types render. Previewing it
 * directly documents the shell itself — the type header, the title/description
 * body, and the note badge — independently of which node type wraps it.
 */
const Frame = ({
  data,
  selected = false,
  showCommandLine = false,
}: {
  data: Record<string, unknown>;
  selected?: boolean;
  showCommandLine?: boolean;
}) => (
  <div style={{ width: 240 }}>
    <NodeCard data={data} selected={selected} showCommandLine={showCommandLine} />
  </div>
);

export const Default = () => (
  <Surface>
    <Frame
      data={{
        type: 'action',
        name: 'Valid Accounts',
        technique_id: 'T1078',
        description: 'Reused VPN credentials harvested earlier in the intrusion.',
      }}
    />
  </Surface>
);

/** Everything the shell can show at once: id, description, note badge. */
export const Everything = () => (
  <Surface>
    <Frame
      showCommandLine
      data={{
        type: 'tool',
        name: 'PsExec',
        technique_id: 'T1569.002',
        description: 'Remote service execution across the finance subnet.',
        command_line: 'psexec \\\\FS01 -u DOMAIN\\svc_backup -p *** cmd.exe',
        notes: 'The service name matched the operator’s known naming pattern.',
      }}
    />
  </Surface>
);

export const Selected = () => (
  <Surface>
    <Frame
      selected
      data={{ type: 'infrastructure', name: 'cdn-edge-14.example[.]net', description: 'Fronted C2 endpoint.' }}
    />
  </Surface>
);

export const DarkAndLight = () => (
  <BothModes>
    <Frame data={{ type: 'action', name: 'Valid Accounts', technique_id: 'T1078', description: 'Reused VPN credentials.' }} />
  </BothModes>
);
