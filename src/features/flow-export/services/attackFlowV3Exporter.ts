import { v4 as uuidv4 } from 'uuid';
import { Node, Edge } from 'reactflow';

// Attack Flow V3 format interfaces based on the builder source
interface DiagramObjectExport {
  id: string;
  instance: string;
  properties?: Array<[string, any]>;
  // Additional fields for specific object types
  anchors?: { [key: string]: string };
  objects?: string[];
  latches?: string[];
  source?: string;
  target?: string;
  handles?: string[];
}

interface PositionMap {
  [objectId: string]: [number, number];
}

interface CameraLocation {
  x: number;
  y: number;
  k: number;
}

interface AttackFlowV3Export {
  schema: string;
  theme?: string;
  objects: DiagramObjectExport[];
  layout?: PositionMap;
  camera?: CameraLocation;
}

export class AttackFlowV3Exporter {
  // Actually creating V2 AFB format that the builder can migrate
  private objects: DiagramObjectExport[] = [];
  private layout: PositionMap = {};
  private nodeIdMap: Map<string, string> = new Map();
  private anchorMap: Map<string, string> = new Map();

  constructor() {}

  /**
   * Convert React Flow nodes and edges to Attack Flow V3 format
   */
  exportToAttackFlowV3(nodes: Node[], edges: Edge[]): AttackFlowV3Export {
    this.objects = [];
    this.layout = {};
    this.nodeIdMap.clear();
    this.anchorMap.clear();

    console.log('Exporting full graph:', nodes.length, 'nodes,', edges.length, 'edges');

    // Generate unique IDs for all nodes
    nodes.forEach(node => {
      this.nodeIdMap.set(node.id, uuidv4());
    });

    // Calculate camera position using all nodes
    const avgX = nodes.length > 0 
      ? nodes.reduce((sum, node) => sum + (node.position.x || 0), 0) / nodes.length 
      : 0;
    const avgY = nodes.length > 0
      ? nodes.reduce((sum, node) => sum + (node.position.y || 0), 0) / nodes.length
      : 0;

    // First, create all block and anchor objects but don't add to objects yet
    const blockObjects: DiagramObjectExport[] = [];
    const blockInstances: string[] = [];
    
    nodes.forEach((node, index) => {
      console.log(`Processing node ${index}:`, node.data?.type || node.type, node.data?.name);
      try {
        const nodeObjects = this.convertNodeToBlock(node, edges);
        blockObjects.push(...nodeObjects);
        
        // Collect block instances for flow children (not anchors)
        nodeObjects.forEach(obj => {
          if (obj.id !== 'vertical_anchor' && obj.id !== 'horizontal_anchor') {
            blockInstances.push(obj.instance);
          }
        });
        
        // Add main block to layout (not anchors)
        const instanceId = this.nodeIdMap.get(node.id)!;
        this.layout[instanceId] = [
          Math.round((node.position.x || 0) / 5) * 5, // Snap to 5px grid
          Math.round((node.position.y || 0) / 5) * 5
        ];
        console.log(`✓ Successfully processed node ${index}`);
      } catch (error) {
        console.error(`❌ Error processing node ${index} (${node.data?.type || node.type}):`, error);
        throw error; // Re-throw to see which node fails
      }
    });

    // Temporarily add block objects to this.objects so edge processing can find them
    this.objects.push(...blockObjects);

    // Process edges as lines with proper anchor-latch connections
    const lineInstances: string[] = [];
    const lineAndLatchObjects: DiagramObjectExport[] = [];
    
    edges.forEach((edge, index) => {
      console.log(`Processing edge ${index}: ${edge.source} -> ${edge.target}`);
      const lineObjects = this.createLineObjectsWithAnchors(edge);
      console.log(`Created ${lineObjects.length} line objects for edge ${index}`);
      
      // Collect line and latch objects separately 
      lineObjects.forEach(obj => {
        lineAndLatchObjects.push(obj);
        
        // Collect line instances for flow children
        if (obj.id === 'dynamic_line') {
          lineInstances.push(obj.instance);
          console.log(`Added dynamic_line ${obj.instance} to line instances`);
        }
      });
    });

    // Clear objects array to rebuild in correct order
    this.objects = [];

    // Create the main flow object
    const flowObject = this.createFlowObject(nodes);
    console.log('Line instances:', lineInstances.length, lineInstances);
    console.log('Block instances:', blockInstances.length, blockInstances);
    flowObject.objects = [...lineInstances, ...blockInstances];
    console.log('Flow objects array:', flowObject.objects.length, flowObject.objects);
    
    // CRITICAL: Insert flow object first, then ALL lines and latches, THEN all blocks and anchors
    // This matches the working file structure exactly
    this.objects = [
      flowObject,
      ...lineAndLatchObjects,  // All lines and latches first
      ...blockObjects          // Then all blocks and anchors
    ];

    // Validate all instance IDs are unique
    const instanceIds = this.objects.map(obj => obj.instance);
    const uniqueIds = new Set(instanceIds);
    if (instanceIds.length !== uniqueIds.size) {
      console.error('Duplicate instance IDs found!', instanceIds);
    }

    return {
      schema: "attack_flow_v2", // This is the schema identifier the builder expects
      theme: "dark_theme",
      objects: this.objects,
      layout: this.layout,
      camera: {
        x: -avgX,
        y: -avgY,
        k: 0.8
      }
    };
  }

  /**
   * Create the main flow container object
   * This will be updated later to include ALL object instances
   */
  private createFlowObject(_nodes: Node[]): DiagramObjectExport {
    const flowInstance = uuidv4();

    return {
      id: "flow",
      instance: flowInstance,
      objects: [], // Will be populated after all objects are created
      properties: [
        ["name", "Attack Flow Export from FlowViz"],
        ["description", "This attack flow was exported from FlowViz and converted to Attack Flow V3 format"],
        ["author", [
          ["name", "FlowViz User"],
          ["identity_class", "individual"],
          ["contact_information", ""]
        ]],
        ["scope", "incident"],
        ["external_references", []],
        ["created", new Date().toISOString()]
      ]
    };
  }

  /**
   * Convert a React Flow node to an Attack Flow block
   */
  private convertNodeToBlock(node: Node, _edges: Edge[]): DiagramObjectExport[] {
    const nodeData = node.data;
    const nodeType = nodeData?.type || node.type;
    const instanceId = this.nodeIdMap.get(node.id);
    
    if (!instanceId) return [];

    // Map node type to Attack Flow template
    const templateId = this.mapNodeTypeToTemplate(nodeType);

    // Create ALL anchors like the working AFB file (all angles)
    const anchors: { [key: string]: string } = {};
    const anchorObjects: DiagramObjectExport[] = [];
    
    // All angles with their anchor types
    const anchorConfig = [
      { angle: "0", type: "horizontal_anchor" },
      { angle: "30", type: "horizontal_anchor" },
      { angle: "60", type: "vertical_anchor" },
      { angle: "90", type: "vertical_anchor" },
      { angle: "120", type: "vertical_anchor" },
      { angle: "150", type: "horizontal_anchor" },
      { angle: "180", type: "horizontal_anchor" },
      { angle: "210", type: "horizontal_anchor" },
      { angle: "240", type: "vertical_anchor" },
      { angle: "270", type: "vertical_anchor" },
      { angle: "300", type: "vertical_anchor" },
      { angle: "330", type: "horizontal_anchor" }
    ];
    
    anchorConfig.forEach(({ angle, type }) => {
      const anchorId = uuidv4();
      anchors[angle] = anchorId;
      
      const anchor: DiagramObjectExport = {
        id: type,
        instance: anchorId,
        latches: []
      };
      anchorObjects.push(anchor);
    });

    // Build properties
    const properties = this.buildNodeProperties(nodeData, nodeType);

    // Create the main block object with anchors
    const blockObject: DiagramObjectExport = {
      id: templateId,
      instance: instanceId,
      anchors,
      properties
    };

    return [blockObject, ...anchorObjects];
  }

  /**
   * Map node types to Attack Flow templates - use correct templates from working file
   */
  private mapNodeTypeToTemplate(nodeType: string): string {
    const templateMap: Record<string, string> = {
      'action': 'action',
      'attack-action': 'action', 
      'tool': 'tool',
      'malware': 'malware',
      'infrastructure': 'infrastructure',
      'vulnerability': 'vulnerability',
      'asset': 'asset',
      'attack-asset': 'asset',
      'condition': 'condition',
      'AND_operator': 'and_operator',
      'OR_operator': 'or_operator'
    };

    return templateMap[nodeType] || 'action';
  }

  /**
   * Map FlowViz confidence values to Attack Flow confidence values
   */
  private mapConfidenceToAttackFlow(confidence: string | undefined): string {
    if (!confidence) return "probable"; // Default

    switch (confidence.toLowerCase()) {
      case 'low':
        return "doubtful";
      case 'medium':
        return "probable";
      case 'high':
        return "very-probable";
      default:
        // If it's already an Attack Flow confidence value, use it as-is
        const validValues = ["speculative", "very-doubtful", "doubtful", "even-odds", "probable", "very-probable", "certain"];
        return validValues.includes(confidence.toLowerCase()) ? confidence.toLowerCase() : "probable";
    }
  }

  /**
   * Build properties array for a node - match working AFB structure
   */
  private buildNodeProperties(data: any, nodeType: string): Array<[string, any]> {
    const properties: Array<[string, any]> = [];

    // Add name (required for all)
    properties.push(["name", data?.name || `Unnamed ${nodeType}`]);

    // Add properties matching the working AFB file structure
    switch (nodeType) {
      case 'action':
      case 'attack-action':
        // Use actual TTP data from the node if available
        const tacticId = data?.tactic_id || null;
        const techniqueId = data?.technique_id || null;
        const mappedConfidence = this.mapConfidenceToAttackFlow(data?.confidence);
        
        // Create TTP tuple property structure that Attack Flow expects
        properties.push(["ttp", [
          ["tactic", tacticId],
          ["technique", techniqueId]
        ]]);
        properties.push(["description", data?.description || "Attack technique description"]);
        properties.push(["confidence", mappedConfidence]);
        properties.push(["execution_start", null]);
        properties.push(["execution_end", null]);
        break;

      case 'malware':
        properties.push(["description", data?.description || "Malware description"]);
        properties.push(["confidence", this.mapConfidenceToAttackFlow(data?.confidence)]);
        properties.push(["is_family", "true"]); // String not boolean!
        properties.push(["aliases", []]);
        properties.push(["kill_chain_phases", []]);
        break;

      case 'tool':
        properties.push(["description", data?.description || "Tool description"]);
        properties.push(["confidence", this.mapConfidenceToAttackFlow(data?.confidence)]);
        properties.push(["aliases", []]);
        properties.push(["kill_chain_phases", []]);
        break;

      case 'asset':
      case 'attack-asset':
        properties.push(["description", data?.description || "Asset description"]);
        properties.push(["confidence", "high"]);
        break;

      case 'infrastructure':
        properties.push(["description", data?.description || "Infrastructure description"]);
        properties.push(["confidence", "high"]);
        break;

      default:
        break;
    }

    return properties;
  }

  /**
   * Create line objects for edges - match working AFB structure with anchors and latches
   */
  private createLineObjectsWithAnchors(edge: Edge): DiagramObjectExport[] {
    const objects: DiagramObjectExport[] = [];
    
    const sourceNodeId = this.nodeIdMap.get(edge.source);
    const targetNodeId = this.nodeIdMap.get(edge.target);
    
    if (!sourceNodeId || !targetNodeId) return objects;

    // Find the specific anchor objects for source (bottom) and target (top) nodes
    // These should have been created and added to this.objects already
    const sourceBlock = this.objects.find(obj => obj.instance === sourceNodeId);
    const targetBlock = this.objects.find(obj => obj.instance === targetNodeId);
    
    if (!sourceBlock?.anchors || !targetBlock?.anchors) {
      console.warn(`Missing block anchors for edge ${edge.source} -> ${edge.target}`, {
        sourceBlock: !!sourceBlock,
        targetBlock: !!targetBlock,
        sourceAnchors: !!sourceBlock?.anchors,
        targetAnchors: !!targetBlock?.anchors
      });
      return objects;
    }
    
    // Get source anchor (bottom) and target anchor (top)
    const sourceAnchorId = sourceBlock.anchors["270"]; // Bottom anchor for outgoing
    const targetAnchorId = targetBlock.anchors["90"];   // Top anchor for incoming
    
    if (!sourceAnchorId || !targetAnchorId) {
      console.warn(`Missing anchor IDs for edge ${edge.source} -> ${edge.target}`, {
        sourceAnchorId,
        targetAnchorId
      });
      return objects;
    }

    // Find the actual anchor objects
    const sourceAnchor = this.objects.find(obj => 
      obj.id === 'vertical_anchor' && obj.instance === sourceAnchorId
    );
    
    const targetAnchor = this.objects.find(obj => 
      obj.id === 'vertical_anchor' && obj.instance === targetAnchorId
    );

    if (!sourceAnchor || !targetAnchor) {
      console.warn(`Missing anchor objects for edge ${edge.source} -> ${edge.target}:`, {
        sourceAnchor: !!sourceAnchor,
        targetAnchor: !!targetAnchor,
        sourceAnchorId,
        targetAnchorId,
        totalObjects: this.objects.length
      });
      return objects;
    }

    console.log(`✓ Found anchors for edge ${edge.source} -> ${edge.target}:`, {
      sourceAnchor: sourceAnchor.instance,
      targetAnchor: targetAnchor.instance,
      sourceAnchorType: sourceAnchor.id,
      targetAnchorType: targetAnchor.id
    });

    // Create source and target latch objects
    const sourceLatchId = uuidv4();
    const targetLatchId = uuidv4();
    
    const sourceLatch: DiagramObjectExport = {
      id: "generic_latch",
      instance: sourceLatchId
    };
    
    const targetLatch: DiagramObjectExport = {
      id: "generic_latch", 
      instance: targetLatchId
    };

    // Add latches to the anchors
    if (!sourceAnchor.latches) sourceAnchor.latches = [];
    if (!targetAnchor.latches) targetAnchor.latches = [];
    sourceAnchor.latches.push(sourceLatchId);
    targetAnchor.latches.push(targetLatchId);

    // Create handle object for the line
    const handleId = uuidv4();
    const handleObject: DiagramObjectExport = {
      id: "generic_handle",
      instance: handleId
    };

    // Create line object that connects latches
    const lineInstance = uuidv4();
    
    const lineObject: DiagramObjectExport = {
      id: "dynamic_line",
      instance: lineInstance,
      source: sourceLatchId,
      target: targetLatchId,
      handles: [handleId]
    };

    objects.push(lineObject, sourceLatch, targetLatch, handleObject);

    return objects;
  }

  /**
   * Export to file
   */
  exportToFile(nodes: Node[], edges: Edge[], filename: string = 'attack-flow-v3.afb'): void {
    const exportData = this.exportToAttackFlowV3(nodes, edges);
    
    // Export as formatted JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}