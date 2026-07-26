import { GenericNode } from 'flowviz';
import { Surface } from '../preview-lib/theme';
import { NodeFrame } from '../preview-lib/node';

/**
 * GenericNode is the fallback shell for the types without a dedicated
 * component. Its whole variant axis is `data.type`, which drives the colour and
 * glyph of the type token — so the card sweeps the four it actually serves.
 */
export const Asset = () => (
  <Surface>
    <NodeFrame
      as={GenericNode}
      data={{
        type: 'asset',
        name: 'Finance file server',
        description: 'Windows Server 2019 host holding the quarterly reporting share.',
      }}
    />
  </Surface>
);

export const Infrastructure = () => (
  <Surface>
    <NodeFrame
      as={GenericNode}
      data={{
        type: 'infrastructure',
        name: 'cdn-edge-14.example[.]net',
        description: 'C2 domain fronted behind a commercial CDN.',
      }}
    />
  </Surface>
);

export const Vulnerability = () => (
  <Surface>
    <NodeFrame
      as={GenericNode}
      data={{
        type: 'vulnerability',
        name: 'CVE-2023-34362',
        description: 'SQL injection in MOVEit Transfer, exploited for initial access.',
      }}
    />
  </Surface>
);

export const Url = () => (
  <Surface>
    <NodeFrame
      as={GenericNode}
      data={{
        type: 'url',
        name: 'hxxps://invoice-portal[.]example/pay',
        description: 'Credential-harvesting page linked from the phishing mail.',
      }}
    />
  </Surface>
);
