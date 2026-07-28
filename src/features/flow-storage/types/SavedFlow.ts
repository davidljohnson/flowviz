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