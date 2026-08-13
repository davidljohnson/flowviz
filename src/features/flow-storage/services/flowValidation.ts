import { SavedFlow } from '../types/SavedFlow';

/**
 * Validation shared by every storage backend.
 *
 * What counts as a well-formed flow is a property of the format, not of where
 * it happens to be kept. Two copies of these rules — one for localStorage, one
 * for the API — would drift, and the first symptom would be a file that imports
 * in one deployment and not another.
 */

const CURRENT_VERSION = '1.0.0';

/**
 * Normalizes an untrusted object into a SavedFlow, or returns null.
 *
 * Fills in what can be safely defaulted (counts, tags, version) and rejects
 * anything missing an identity or a graph.
 */
// Untyped input by nature — this is the boundary that decides what a SavedFlow is.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validateFlow = (flow: any): SavedFlow | null => {
  try {
    if (!flow?.id || !flow.title || !flow.nodes || !flow.edges || !flow.metadata) {
      return null;
    }

    if (!Array.isArray(flow.nodes) || !Array.isArray(flow.edges)) {
      return null;
    }

    if (!flow.metadata.createdAt || !flow.metadata.updatedAt) {
      return null;
    }

    return {
      id: flow.id,
      title: flow.title,
      sourceUrl: flow.sourceUrl,
      sourceText: flow.sourceText,
      // Copied through with its absent/null distinction intact: `?? undefined`
      // or a truthiness check here would collapse "vision did not run" into
      // "we don't know", and the excerpt check would go quiet on flows it can
      // actually verify.
      ...('visionText' in flow ? { visionText: flow.visionText } : {}),
      inputMode: flow.inputMode || 'url',
      nodes: flow.nodes,
      edges: flow.edges,
      metadata: {
        createdAt: flow.metadata.createdAt,
        updatedAt: flow.metadata.updatedAt,
        version: flow.metadata.version || CURRENT_VERSION,
        description: flow.metadata.description,
        tags: Array.isArray(flow.metadata.tags) ? flow.metadata.tags : [],
        nodeCount: flow.metadata.nodeCount ?? flow.nodes.length,
        edgeCount: flow.metadata.edgeCount ?? flow.edges.length,
      },
      visualization: flow.visualization || {},
      analysis: flow.analysis || {},
      assistantMessages: Array.isArray(flow.assistantMessages)
        ? flow.assistantMessages
        : undefined,
    };
  } catch {
    return null;
  }
};

/** Whether a file looks like a single flow or a bulk export of them. */
export const isValidFlowFile = async (file: File): Promise<boolean> => {
  try {
    if (
      !file.type.includes('json') &&
      !file.name.endsWith('.json') &&
      !file.name.endsWith('.flowviz')
    ) {
      return false;
    }

    const data = JSON.parse(await file.text());

    if (data.flows && Array.isArray(data.flows)) {
      return data.flows.length > 0 && validateFlow(data.flows[0]) !== null;
    }

    return validateFlow(data) !== null;
  } catch {
    return false;
  }
};

/** A single flow as a downloadable `.flowviz` payload. */
export const flowToBlob = (flow: SavedFlow, exportedBy: string): Blob =>
  new Blob(
    [
      JSON.stringify(
        { ...flow, exportedAt: new Date().toISOString(), exportedBy, version: CURRENT_VERSION },
        null,
        2
      ),
    ],
    { type: 'application/json' }
  );

/** Many flows as one downloadable bundle. */
export const flowsToBlob = (flows: SavedFlow[], exportedBy: string): Blob =>
  new Blob(
    [
      JSON.stringify(
        {
          flows,
          exportedAt: new Date().toISOString(),
          exportedBy,
          version: CURRENT_VERSION,
          totalFlows: flows.length,
        },
        null,
        2
      ),
    ],
    { type: 'application/json' }
  );

export { CURRENT_VERSION };
