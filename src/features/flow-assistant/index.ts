export { default as AssistantPanel } from './components/AssistantPanel';
export { useAssistant } from './hooks/useAssistant';
export { applyAssistantOps, createOpsSession } from './services/opsApplier';
export type { OpsSession } from './services/opsApplier';
export { serializeGraph, serializeSelection } from './services/graphContext';
export type { AssistantOp, AssistantResponse, ChatMessage, OpResult } from './types';
