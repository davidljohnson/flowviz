import { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge, ReactFlowInstance } from 'reactflow';

export interface StoryStep {
  id: string;
  nodes: Node[];
  title: string;
  description?: string;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface StoryModeState {
  isPlaying: boolean;
  currentStep: number;
  steps: StoryStep[];
  progress: number; // 0-100
}

export interface StoryModeControls {
  playStory: () => void;
  pauseStory: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (stepIndex: number) => void;
  resetStory: () => void;
}

interface UseStoryModeProps {
  nodes: Node[];
  edges: Edge[];
  reactFlowInstance: ReactFlowInstance | null;
  storyModeSpeed?: number; // Duration in seconds for each step
}

export const useStoryMode = ({
  nodes,
  // `edges` stays on the props type (callers pass it) but isn't destructured:
  // story steps are derived from node positions alone.
  reactFlowInstance,
  storyModeSpeed = 3
}: UseStoryModeProps) => {
  const [storyState, setStoryState] = useState<StoryModeState>({
    isPlaying: false,
    currentStep: 0,
    steps: [],
    progress: 0
  });

  // ReturnType<typeof setInterval> rather than NodeJS.Timeout: this runs in the
  // browser, where setInterval returns a number, and the NodeJS namespace only
  // exists if @types/node is pulled into the app's compilation.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stableNodesRef = useRef<Node[]>([]);

  // Generate story steps based on node positions (top to bottom)
  const generateStorySteps = useCallback((): StoryStep[] => {
    if (nodes.length === 0) return [];

    // Sort nodes by Y position (top to bottom)
    const sortedNodes = [...nodes].sort((a, b) => 
      (a.position.y || 0) - (b.position.y || 0)
    );

    // Group nodes by approximate Y levels (within 100px of each other)
    const nodeGroups: Node[][] = [];
    let currentGroup: Node[] = [];
    let currentY = sortedNodes[0]?.position.y || 0;

    sortedNodes.forEach(node => {
      const nodeY = node.position.y || 0;
      
      // If node is close to current Y level, add to current group
      if (Math.abs(nodeY - currentY) < 150) {
        currentGroup.push(node);
      } else {
        // Start new group
        if (currentGroup.length > 0) {
          nodeGroups.push([...currentGroup]);
        }
        currentGroup = [node];
        currentY = nodeY;
      }
    });

    // Add final group
    if (currentGroup.length > 0) {
      nodeGroups.push(currentGroup);
    }

    // Convert groups to story steps
    const steps: StoryStep[] = nodeGroups.map((group, index) => {
      // Calculate center position and bounds for this group
      const centerX = group.reduce((sum, node) => sum + (node.position.x || 0), 0) / group.length;
      const centerY = group.reduce((sum, node) => sum + (node.position.y || 0), 0) / group.length;
      
      // Calculate bounding box for better framing
      const minX = Math.min(...group.map(node => (node.position.x || 0) - 110)); // Account for node width
      const maxX = Math.max(...group.map(node => (node.position.x || 0) + 110));
      const minY = Math.min(...group.map(node => (node.position.y || 0) - 65)); // Account for node height
      const maxY = Math.max(...group.map(node => (node.position.y || 0) + 65));
      
      const groupWidth = maxX - minX;
      const groupHeight = maxY - minY;
      
      // Calculate zoom to fit the group nicely (with padding)
      const viewportWidth = 800;
      const viewportHeight = 600;
      const padding = 100;
      
      const zoomX = (viewportWidth - padding * 2) / groupWidth;
      const zoomY = (viewportHeight - padding * 2) / groupHeight;
      const optimalZoom = Math.min(Math.min(zoomX, zoomY), 1.2); // Cap at 1.2x for readability

      // Generate title based on node types in this group
      const nodeTypes = [...new Set(group.map(node => node.data?.type || node.type))];
      const title = generateStepTitle(group, index, nodeTypes);

      return {
        id: `step-${index}`,
        nodes: group,
        title,
        description: generateStepDescription(group),
        viewport: {
          x: -centerX + 400,
          y: -centerY + 300, 
          zoom: Math.max(optimalZoom, 0.5) // Minimum zoom of 0.5
        }
      };
    });

    return steps;
  }, [nodes]);

  // Generate meaningful titles for steps
  const generateStepTitle = (nodes: Node[], stepIndex: number, nodeTypes: string[]): string => {
    if (nodeTypes.includes('action')) {
      const tactics = nodes
        .filter(node => node.data?.tactic_id)
        .map(node => node.data.tactic_id)
        .filter((tactic, index, arr) => arr.indexOf(tactic) === index);
      
      if (tactics.length > 0) {
        return `${tactics.join(' & ')} Phase`;
      }
    }

    if (nodeTypes.includes('tool')) return `Tools & Techniques`;
    if (nodeTypes.includes('malware')) return `Malware Deployment`;
    if (nodeTypes.includes('infrastructure')) return `Infrastructure Setup`;
    if (nodeTypes.includes('asset')) return `Target Assets`;

    return `Step ${stepIndex + 1}`;
  };

  // Generate descriptions for steps
  const generateStepDescription = (nodes: Node[]): string => {
    const nodeCount = nodes.length;
    const types = [...new Set(nodes.map(node => node.data?.type || node.type))];
    
    if (nodeCount === 1) {
      return `Focus on ${nodes[0].data?.name || 'this element'}`;
    }
    
    return `Examining ${nodeCount} elements: ${types.join(', ')}`;
  };

  // Update stable nodes reference only when nodes actually change
  useEffect(() => {
    // Check if nodes have actually changed (not just reference)
    const hasChanged = nodes.length !== stableNodesRef.current.length ||
      nodes.some((node, index) => 
        !stableNodesRef.current[index] || 
        stableNodesRef.current[index].id !== node.id ||
        stableNodesRef.current[index].position.x !== node.position.x ||
        stableNodesRef.current[index].position.y !== node.position.y
      );

    if (hasChanged) {
      stableNodesRef.current = nodes;
      
      // Only regenerate steps when nodes truly change
      if (nodes.length === 0) {
        setStoryState(prev => ({
          ...prev,
          steps: [],
          currentStep: 0,
          progress: 0,
          isPlaying: false
        }));
        return;
      }

      const steps = generateStorySteps();
      setStoryState(prev => {
        // Don't reset if currently playing - let it finish
        if (prev.isPlaying) {
          return { ...prev, steps }; // Update steps but keep current position
        }
        
        // Reset position only for new graphs
        const shouldResetPosition = prev.steps.length === 0 || steps.length !== prev.steps.length;
        
        return {
          ...prev,
          steps,
          currentStep: shouldResetPosition ? 0 : Math.min(prev.currentStep, steps.length - 1),
          progress: shouldResetPosition ? 0 : ((Math.min(prev.currentStep, steps.length - 1) + 1) / steps.length) * 100
        };
      });
    }
  }, [nodes, generateStorySteps]);

  // Story control functions
  const playStory = useCallback(() => {
    if (!reactFlowInstance) return;
    
    // Clear any existing timeout
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    
    setStoryState(prev => {
      if (prev.steps.length === 0) return prev;
      
      const startStep = prev.currentStep;
      const totalSteps = prev.steps.length;
      
      const playStep = (stepIndex: number) => {
        setStoryState(current => {
          if (stepIndex >= totalSteps) {
            // Story finished
            return { 
              ...current, 
              isPlaying: false, 
              progress: 100,
              currentStep: totalSteps - 1 // Stay on last step
            };
          }

          // Get the step from current state
          const step = current.steps[stepIndex];
          
          // Handle viewport
          if (step && step.nodes.length > 0) {
            reactFlowInstance.fitView({ 
              nodes: step.nodes,
              duration: 1000,
              padding: 0.3,
              maxZoom: 1.2,
              minZoom: 0.4
            });
          }

          // Schedule next step
          intervalRef.current = setTimeout(() => {
            playStep(stepIndex + 1);
          }, storyModeSpeed * 1000); // Convert seconds to milliseconds

          // Update state
          return {
            ...current,
            currentStep: stepIndex,
            progress: ((stepIndex + 1) / totalSteps) * 100
          };
        });
      };

      // Start playing immediately
      playStep(startStep);
      
      return {
        ...prev,
        isPlaying: true
      };
    });
  }, [reactFlowInstance, storyModeSpeed]);

  const pauseStory = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    setStoryState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const nextStep = useCallback(() => {
    if (!reactFlowInstance) return;
    
    // Stop any ongoing playback
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    
    setStoryState(prev => {
      if (prev.currentStep >= prev.steps.length - 1) return prev;
      
      const nextStepIndex = prev.currentStep + 1;
      const step = prev.steps[nextStepIndex];
      
      // Use fitView with specific nodes for proper centering
      if (step && step.nodes.length > 0) {
        reactFlowInstance.fitView({ 
          nodes: step.nodes,
          duration: 800,
          padding: 0.3,
          maxZoom: 1.2,
          minZoom: 0.4
        });
      }
      
      return {
        ...prev,
        currentStep: nextStepIndex,
        progress: ((nextStepIndex + 1) / prev.steps.length) * 100,
        isPlaying: false
      };
    });
  }, [reactFlowInstance]);

  const prevStep = useCallback(() => {
    if (!reactFlowInstance) return;
    
    // Stop any ongoing playback
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    
    setStoryState(prev => {
      if (prev.currentStep <= 0) return prev;
      
      const prevStepIndex = prev.currentStep - 1;
      const step = prev.steps[prevStepIndex];
      
      // Use fitView with specific nodes for proper centering
      if (step && step.nodes.length > 0) {
        reactFlowInstance.fitView({ 
          nodes: step.nodes,
          duration: 800,
          padding: 0.3,
          maxZoom: 1.2,
          minZoom: 0.4
        });
      }
      
      return {
        ...prev,
        currentStep: prevStepIndex,
        progress: ((prevStepIndex + 1) / prev.steps.length) * 100,
        isPlaying: false
      };
    });
  }, [reactFlowInstance]);

  const goToStep = useCallback((stepIndex: number) => {
    if (!reactFlowInstance) return;
    
    // Stop any ongoing playback
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    
    setStoryState(prev => {
      if (stepIndex < 0 || stepIndex >= prev.steps.length) return prev;
      
      const step = prev.steps[stepIndex];
      
      // Use fitView with specific nodes for better centering
      if (step && step.nodes.length > 0) {
        reactFlowInstance.fitView({ 
          nodes: step.nodes,
          duration: 800,
          padding: 0.3,
          maxZoom: 1.2,
          minZoom: 0.4
        });
      }
      
      return {
        ...prev,
        currentStep: stepIndex,
        progress: ((stepIndex + 1) / prev.steps.length) * 100,
        isPlaying: false
      };
    });
  }, [reactFlowInstance]);

  const resetStory = useCallback(() => {
    pauseStory();
    setStoryState(prev => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ duration: 800 });
      }
      return {
        ...prev,
        currentStep: 0,
        progress: 0,
        isPlaying: false
      };
    });
  }, [pauseStory, reactFlowInstance]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, []);

  const controls: StoryModeControls = {
    playStory,
    pauseStory,
    nextStep,
    prevStep,
    goToStep,
    resetStory
  };

  return {
    storyState,
    controls,
    currentStepData: storyState.steps[storyState.currentStep] || null
  };
};