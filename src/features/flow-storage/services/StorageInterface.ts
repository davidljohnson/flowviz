import { SavedFlow, ImportResult } from '../types/SavedFlow';

export interface IFlowStorage {
  // Core operations
  saveFlow(flow: SavedFlow): Promise<void>;
  loadFlow(id: string): Promise<SavedFlow>;
  listFlows(): Promise<SavedFlow[]>;
  deleteFlow(id: string): Promise<void>;
  
  // Batch operations
  deleteMultiple(ids: string[]): Promise<void>;
  duplicateFlow(id: string, newTitle?: string): Promise<SavedFlow>;
  
  // Search and filtering
  searchFlows(query: string): Promise<SavedFlow[]>;
  getFlowsByTags(tags: string[]): Promise<SavedFlow[]>;
  
  // Import/Export
  exportFlow(id: string, filename?: string): Promise<Blob>;
  exportAllFlows(): Promise<Blob>;
  importFlow(file: File): Promise<SavedFlow>;
  importFlows(files: FileList): Promise<ImportResult>;
  
  // Metadata and management
  clearAllFlows(): Promise<void>;
  updateFlowMetadata(id: string, updates: Partial<SavedFlow['metadata']>): Promise<void>;
  
  // Validation
  validateFlow(flow: any): SavedFlow | null;
  isValidFlowFile(file: File): Promise<boolean>;
}

export class StorageError extends Error {
  constructor(
    message: string,
    public code: 'QUOTA_EXCEEDED' | 'NOT_FOUND' | 'INVALID_FORMAT' | 'DUPLICATE' | 'UNKNOWN' = 'UNKNOWN'
  ) {
    super(message);
    this.name = 'StorageError';
  }
}