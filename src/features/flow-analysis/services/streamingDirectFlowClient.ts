import { APIError } from './errors';
import { Node, Edge } from 'reactflow';

export interface StreamingDirectFlowCallbacks {
  onNode: (node: Node) => void;
  onEdge: (edge: Edge) => void;
  onProgress?: (stage: string, message: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export interface StreamingOptions {
  provider?: string;
  model?: string;
}

export class StreamingDirectFlowClient {
  private nodeIdMap = new Map<string, string>();
  private processedNodeIds = new Set<string>();
  private processedEdgeIds = new Set<string>();
  private pendingEdges: Array<{edge: Edge, source: string, target: string}> = [];
  private emittedNodeIds = new Set<string>();

  async extractDirectFlowStreaming(
    input: string,
    callbacks: StreamingDirectFlowCallbacks,
    options?: StreamingOptions
  ): Promise<void> {
    console.log('=== Starting Streaming Direct Flow Extraction ===');
    console.log('Provider:', options?.provider || 'default');
    console.log('Model:', options?.model || 'default');

    try {
      // Determine if input is URL or text content
      const isUrl = input.startsWith('http://') || input.startsWith('https://');

      const response = await fetch('/api/analyze-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(isUrl ? { url: input } : { text: input }),
          system: "You are an expert in cyber threat intelligence analysis.",
          provider: options?.provider,
          model: options?.model,
        }),
      });

      if (!response.ok) {
        throw new APIError(`Failed to stream from Claude: ${response.statusText}`, response.status);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new APIError('No response body available for streaming', 500);
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let responseText = '';
      let hasError = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process SSE events
        const lines = buffer.split('\n');
        buffer = lines[lines.length - 1]; // Keep incomplete line in buffer
        
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              // Only parse and emit if no error occurred
              if (!hasError) {
                this.parseAndEmitAllNodes(responseText, callbacks);
                callbacks.onComplete();
              }
              return;
            }
            
            try {
              const event = JSON.parse(data);
              
              // Handle error events from server
              if (event.type === 'error' || event.error) {
                console.error('❌ Server error:', event.error);
                hasError = true;
                callbacks.onError(new Error(event.error || 'Server error occurred'));
                // Don't return here, let it process [DONE] to properly end the stream
              }
              
              // Handle progress updates from server
              if (event.type === 'progress') {
                console.log(`📈 ${event.stage}: ${event.message}`);
                callbacks.onProgress?.(event.stage, event.message);
              }
              
              if (event.type === 'content_block_delta' && event.delta?.text) {
                responseText += event.delta.text;
                
                // Try to parse nodes as they appear in the stream
                this.tryParseNodesFromPartial(responseText, callbacks);
                
                // Log progress for debugging
                if (responseText.includes('"edges"')) {
                  console.log('📊 Edges array detected in stream');
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Streaming extraction failed:', error);
      callbacks.onError(error as Error);
    }
  }

  private tryParseNodesFromPartial(text: string, callbacks: StreamingDirectFlowCallbacks) {
    // Look for individual node objects as they appear
    // Use a more sophisticated approach to handle nested JSON
    const nodeStartRegex = /\{\s*"id"\s*:\s*"([^"]+)"\s*,\s*"type"\s*:\s*"([^"]+)"\s*,\s*"data"\s*:\s*\{/g;
    let match;
    
    while ((match = nodeStartRegex.exec(text)) !== null) {
      const nodeId = match[1];
      const startIndex = match.index;
      
      if (!this.processedNodeIds.has(nodeId)) {
        // Try to find the matching closing braces for the complete node object
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;
        let endIndex = startIndex;
        
        for (let i = startIndex; i < text.length; i++) {
          const char = text[i];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          
          if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') {
              braceCount++;
            } else if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                endIndex = i + 1;
                break;
              }
            }
          }
        }
        
        if (endIndex > startIndex && braceCount === 0) {
          const nodeStr = text.substring(startIndex, endIndex);
          
          try {
            const node = JSON.parse(nodeStr);
          
          // Skip if this is actually an edge (has source and target, or id starts with 'edge')
          if (node.source && node.target || node.id?.startsWith('edge')) {
            // Don't log this anymore since it's expected behavior with current Claude
            return;
          }
          
          this.processedNodeIds.add(nodeId);
          this.emittedNodeIds.add(nodeId);
          
          // Ensure all properties are at the root of data
          const nodeData = {
            ...node.data,
            type: node.type,
            id: node.id
          };
          
          const flowNode: Node = {
            id: node.id,
            type: node.type,
            data: nodeData,
            position: { x: 0, y: 0 } // Will be set by Dagre layout
          };
          
          callbacks.onNode(flowNode);
          console.log(`✨ Streaming node: ${flowNode.id} (${node.data?.tactic_name || node.type})`);
          
          // Check if any pending edges can now be emitted
          this.processPendingEdges(callbacks);
          } catch (e) {
            // Node not complete yet
          }
        }
      }
    }
    
    // Look for edge objects as they appear - more flexible regex
    const edgeRegex = /\{\s*"id"\s*:\s*"([^"]+)"\s*,\s*"source"\s*:\s*"([^"]+)"\s*,\s*"target"\s*:\s*"([^"]+)"[^}]*\}/g;
    let edgeMatch;
    
    while ((edgeMatch = edgeRegex.exec(text)) !== null) {
      const edgeStr = edgeMatch[0];
      const edgeId = edgeMatch[1];
      const sourceId = edgeMatch[2];
      const targetId = edgeMatch[3];
      
      if (!this.processedEdgeIds.has(edgeId)) {
        try {
          const edge = JSON.parse(edgeStr);
          this.processedEdgeIds.add(edgeId);
          
          const flowEdge: Edge = {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: 'floating',
            label: edge.label || ''
          };
          
          // Only emit edge if both nodes exist, otherwise add to pending
          if (this.emittedNodeIds.has(sourceId) && this.emittedNodeIds.has(targetId)) {
            callbacks.onEdge(flowEdge);
            console.log(`🔗 Streaming edge: ${flowEdge.id} (${sourceId} → ${targetId})`);
          } else {
            this.pendingEdges.push({ edge: flowEdge, source: sourceId, target: targetId });
            console.log(`⏳ Pending edge: ${flowEdge.id} (waiting for nodes: ${sourceId}=${this.emittedNodeIds.has(sourceId)}, ${targetId}=${this.emittedNodeIds.has(targetId)})`);
          }
        } catch (e) {
          console.log(`Failed to parse edge: ${edgeStr.substring(0, 50)}...`, e);
        }
      }
    }
  }
  
  private processPendingEdges(callbacks: StreamingDirectFlowCallbacks) {
    const remainingEdges: typeof this.pendingEdges = [];
    
    for (const pending of this.pendingEdges) {
      if (this.emittedNodeIds.has(pending.source) && this.emittedNodeIds.has(pending.target)) {
        callbacks.onEdge(pending.edge);
        console.log(`🔗 Emitting pending edge: ${pending.edge.id} (${pending.source} → ${pending.target})`);
      } else {
        remainingEdges.push(pending);
      }
    }
    
    this.pendingEdges = remainingEdges;
  }

  private parseAndEmitAllNodes(text: string, callbacks: StreamingDirectFlowCallbacks) {
    try {
      // Clean the response text and parse the complete JSON
      const cleanedText = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      const json = JSON.parse(cleanedText);
      
      // Only process any remaining nodes that weren't caught during streaming
      if (json.nodes && Array.isArray(json.nodes)) {
        let remainingNodes = 0;
        json.nodes.forEach((node: any) => {
          // Skip edges that Claude put in the nodes array (silently, no warnings)
          if (node.source && node.target) {
            return;
          }
          
          // Only process nodes not seen yet
          if (!this.processedNodeIds.has(node.id)) {
            this.processedNodeIds.add(node.id);
            this.emittedNodeIds.add(node.id);
            
            // Ensure all properties are at the root of data
            const nodeData = {
              ...node.data,
              type: node.type,
              id: node.id
            };
            
            const flowNode: Node = {
              id: node.id,
              type: node.type,
              data: nodeData,
              position: { x: 0, y: 0 } // Will be set by Dagre layout
            };
            
            callbacks.onNode(flowNode);
            console.log(`✨ Final node: ${flowNode.id} (${node.data?.tactic_name || node.type})`);
            remainingNodes++;
            
            // Check pending edges after each node
            this.processPendingEdges(callbacks);
          }
        });
        
        if (remainingNodes === 0) {
          console.log(`✅ All nodes were processed during streaming`);
        }
      }
      
      // Skip edge processing - all edges are handled during streaming
      // Process any remaining pending edges one final time
      this.processPendingEdges(callbacks);
    } catch (e) {
      console.error('Failed to parse final response:', e);
    }
  }
}