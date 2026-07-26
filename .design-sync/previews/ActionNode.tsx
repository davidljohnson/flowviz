import { ActionNode } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';

/**
 * ActionNode takes ReactFlow's NodeProps. Only `data` and `selected` change the
 * render, so the rest of the NodeProps surface is filled in once here rather
 * than repeated in every cell.
 */
const base = { id: 'n1', type: 'action', xPos: 0, yPos: 0, zIndex: 0, isConnectable: false, dragging: false };

const Node = ({ data, selected = false }: { data: object; selected?: boolean }) => (
  <div style={{ width: 240 }}>
    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
    <ActionNode {...({ ...base, data, selected } as any)} />
  </div>
);

const spearphishing = {
  type: 'action',
  name: 'Spearphishing Attachment',
  technique_id: 'T1566.001',
  description:
    'A macro-enabled Word document sent to three finance-team mailboxes, disguised as an overdue invoice.',
};

export const Default = () => (
  <Surface>
    <Node data={spearphishing} />
  </Surface>
);

export const Selected = () => (
  <Surface>
    <Node
      selected
      data={{
        type: 'action',
        name: 'Scheduled Task/Job',
        technique_id: 'T1053.005',
        description: 'Persistence established through a scheduled task running every 30 minutes.',
      }}
    />
  </Surface>
);

export const WithNote = () => (
  <Surface>
    <Node
      data={{
        type: 'action',
        name: 'OS Credential Dumping: LSASS Memory',
        technique_id: 'T1003.001',
        description: 'Credentials harvested from LSASS memory using a renamed copy of procdump.',
        notes: 'Analyst note: the renamed binary evaded the endpoint rule for procdump.exe.',
      }}
    />
  </Surface>
);

/** No technique id and no description — the shortest card the type produces. */
export const Minimal = () => (
  <Surface>
    <Node data={{ type: 'action', name: 'Lateral Movement' }} />
  </Surface>
);

/** The card carries a lit top edge and a tinted type token on dark; on light it
 *  flattens to a plain white card with a deepened glyph. */
export const DarkAndLight = () => (
  <BothModes>
    <Node data={spearphishing} />
  </BothModes>
);
