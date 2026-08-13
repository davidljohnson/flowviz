import { Node, Edge, Viewport } from 'reactflow';

/**
 * Assistant conversation carried with the flow. Structurally typed here so
 * flow-storage stays decoupled from the flow-assistant feature.
 */
export interface SavedAssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
  opResults?: unknown[];
}

export interface SavedFlow {
  id: string;
  title: string;
  sourceUrl?: string;
  sourceText?: string;
  /**
   * What the vision pass read out of the article's images, saved because it is
   * part of what the nodes were grounded in. Without it a reopened flow can
   * only be checked against the prose, and every screenshot-derived excerpt
   * looks invented.
   *
   * Three states, and the difference matters. A string is the reading. `null`
   * means vision did not run, so the article alone IS the whole corpus and the
   * check can speak with confidence. Absent means the flow predates this field
   * and we simply do not know which of those it was — the check stays quiet
   * rather than guessing.
   */
  visionText?: string | null;
  inputMode: 'url' | 'text';
  
  // Flow data
  nodes: Node[];
  edges: Edge[];
  
  // Metadata
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    description?: string;
    tags: string[];
    nodeCount: number;
    edgeCount: number;
  };
  
  // Visualization state
  visualization: {
    viewport?: Viewport;
  };

  // Assistant conversation at save time, so reopening an investigation
  // restores its context
  assistantMessages?: SavedAssistantMessage[];
  
  // Analysis metadata
  analysis: {
    duration?: number; // How long analysis took (ms)
    confidence?: 'low' | 'medium' | 'high';
    extractedTechniques?: string[];
    extractedTactics?: string[];
  };
}

export interface ImportResult {
  success: SavedFlow[];
  failed: Array<{
    filename: string;
    error: string;
  }>;
  duplicates: Array<{
    existing: SavedFlow;
    imported: SavedFlow;
  }>;
}