import { SearchInputWithStatus } from 'flowviz';
import { Surface } from '../preview-lib/theme';

/** The whole variant axis: the border and the message colour follow `status`. */
export const AllStatuses = () => (
  <Surface width={440}>
    <div style={{ display: 'grid', gap: 14 }}>
      <SearchInputWithStatus fullWidth defaultValue="https://example.com/report" statusMessage="Paste a URL or article text" />
      <SearchInputWithStatus
        fullWidth
        status="success"
        defaultValue="https://example.com/threat-report"
        statusMessage="Article fetched — 4,200 words"
      />
      <SearchInputWithStatus
        fullWidth
        status="warning"
        defaultValue="https://example.com/paywalled"
        statusMessage="Only the first two paragraphs were readable"
      />
      <SearchInputWithStatus
        fullWidth
        status="error"
        defaultValue="not-a-url"
        statusMessage="That doesn't look like a URL"
      />
    </div>
  </Surface>
);

export const WithoutMessage = () => (
  <Surface width={420}>
    <SearchInputWithStatus fullWidth status="success" defaultValue="https://example.com/report" />
  </Surface>
);
