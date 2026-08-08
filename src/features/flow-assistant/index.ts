export { default as AssistantPanel } from './components/AssistantPanel';
export { useAssistant } from './hooks/useAssistant';
export { applyAssistantOps, createOpsSession } from './services/opsApplier';
export type { OpsSession } from './services/opsApplier';
export { serializeGraph, serializeContexts } from './services/graphContext';
export type { SerializedContext } from './services/graphContext';
export type { AssistantOp, AssistantResponse, ChatMessage, OpResult } from './types';
