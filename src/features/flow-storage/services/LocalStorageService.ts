import { SavedFlow, ImportResult } from '../types/SavedFlow';
import { IFlowStorage, StorageError } from './StorageInterface';
import {
  validateFlow,
  isValidFlowFile,
  flowToBlob,
  flowsToBlob,
} from './flowValidation';

/**
 * A catch binding is `unknown` — anything can be thrown, not just an Error.
 * Read the message where there is one, and stringify whatever else turns up
 * rather than reporting "undefined" to the user.
 */
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export class LocalStorageService implements IFlowStorage {
  private readonly STORAGE_KEY = 'flowviz_saved_flows';
  private readonly VERSION = '1.0.0';
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

  async saveFlow(flow: SavedFlow): Promise<void> {
    try {
      const flows = await this.listFlows();
      const existingIndex = flows.findIndex(f => f.id === flow.id);
      
      // Update timestamps and metadata
      flow.metadata.updatedAt = new Date().toISOString();
      flow.metadata.version = this.VERSION;
      flow.metadata.nodeCount = flow.nodes.length;
      flow.metadata.edgeCount = flow.edges.length;
      
      if (existingIndex >= 0) {
        flows[existingIndex] = flow;
      } else {
        flow.metadata.createdAt = flow.metadata.createdAt || new Date().toISOString();
        flows.push(flow);
      }
      
      // Sort by updatedAt (newest first)
      flows.sort((a, b) => 
        new Date(b.metadata.updatedAt).getTime() - 
        new Date(a.metadata.updatedAt).getTime()
      );
      
      this.saveToStorage(flows);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(`Failed to save flow: ${errorMessage(error)}`);
    }
  }

  async loadFlow(id: string): Promise<SavedFlow> {
    const flows = await this.listFlows();
    const flow = flows.find(f => f.id === id);
    if (!flow) {
      throw new StorageError(`Flow with ID ${id} not found`, 'NOT_FOUND');
    }
    return flow;
  }

  async listFlows(): Promise<SavedFlow[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const flows = JSON.parse(stored) as SavedFlow[];
      
      // Validate each flow
      return flows.filter(flow => this.validateFlow(flow) !== null);
    } catch (error) {
      console.error('Error loading flows from storage:', error);
      return [];
    }
  }

  async deleteFlow(id: string): Promise<void> {
    const flows = await this.listFlows();
    const filtered = flows.filter(f => f.id !== id);
    
    if (filtered.length === flows.length) {
      throw new StorageError(`Flow with ID ${id} not found`, 'NOT_FOUND');
    }
    
    this.saveToStorage(filtered);
  }

  async deleteMultiple(ids: string[]): Promise<void> {
    const flows = await this.listFlows();
    const filtered = flows.filter(f => !ids.includes(f.id));
    this.saveToStorage(filtered);
  }

  async duplicateFlow(id: string, newTitle?: string): Promise<SavedFlow> {
    const original = await this.loadFlow(id);
    const timestamp = new Date().toISOString();
    
    const duplicate: SavedFlow = {
      ...original,
      id: crypto.randomUUID(),
      title: newTitle || `${original.title} (Copy)`,
      metadata: {
        ...original.metadata,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
    };
    
    await this.saveFlow(duplicate);
    return duplicate;
  }

  async searchFlows(query: string): Promise<SavedFlow[]> {
    const flows = await this.listFlows();
    const searchTerm = query.toLowerCase();
    
    return flows.filter(flow => 
      flow.title.toLowerCase().includes(searchTerm) ||
      flow.metadata.description?.toLowerCase().includes(searchTerm) ||
      flow.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      flow.sourceUrl?.toLowerCase().includes(searchTerm)
    );
  }

  async getFlowsByTags(tags: string[]): Promise<SavedFlow[]> {
    const flows = await this.listFlows();
    return flows.filter(flow =>
      tags.some(tag => flow.metadata.tags.includes(tag))
    );
  }

  async exportFlow(id: string, _filename?: string): Promise<Blob> {
    return flowToBlob(await this.loadFlow(id), 'FlowViz Open Source');
  }

  async exportAllFlows(): Promise<Blob> {
    return flowsToBlob(await this.listFlows(), 'FlowViz Open Source');
  }

  async importFlow(file: File): Promise<SavedFlow> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // This method now only handles single flows
      // Bulk exports should be handled by importFlows
      const flow = data;
      
      // Validate the flow
      const validatedFlow = this.validateFlow(flow);
      if (!validatedFlow) {
        throw new Error('Invalid flow format');
      }
      
      // Generate new ID to avoid conflicts
      validatedFlow.id = crypto.randomUUID();
      validatedFlow.metadata.updatedAt = new Date().toISOString();
      
      await this.saveFlow(validatedFlow);
      return validatedFlow;
    } catch (error) {
      throw new StorageError(`Failed to import flow: ${errorMessage(error)}`, 'INVALID_FORMAT');
    }
  }

  async importFlows(files: FileList): Promise<ImportResult> {
    const result: ImportResult = {
      success: [],
      failed: [],
      duplicates: []
    };
    
    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Handle different import formats
        if (data.flows && Array.isArray(data.flows)) {
          // Bulk export format - import ALL flows
          if (data.flows.length === 0) {
            result.failed.push({
              filename: file.name,
              error: 'No flows found in bulk export file'
            });
            continue;
          }
          
          // Import each flow in the bulk export
          for (const flowData of data.flows) {
            try {
              const validatedFlow = this.validateFlow(flowData);
              if (!validatedFlow) {
                result.failed.push({
                  filename: file.name,
                  error: `Invalid flow format for flow: ${flowData.title || 'Unknown'}`
                });
                continue;
              }
              
              // Generate new ID and save
              validatedFlow.id = crypto.randomUUID();
              validatedFlow.metadata.updatedAt = new Date().toISOString();
              
              await this.saveFlow(validatedFlow);
              result.success.push(validatedFlow);
            } catch (error) {
              result.failed.push({
                filename: file.name,
                error: `Failed to import flow: ${errorMessage(error)}`
              });
            }
          }
        } else {
          // Single flow format - use existing importFlow method
          const flow = await this.importFlow(file);
          result.success.push(flow);
        }
      } catch (error) {
        result.failed.push({
          filename: file.name,
          error: errorMessage(error)
        });
      }
    }
    
    return result;
  }

  async clearAllFlows(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  async updateFlowDetails(
    id: string,
    updates: { title?: string; description?: string; tags?: string[] }
  ): Promise<void> {
    // Reads the stored flow rather than accepting one from the caller, so the
    // graph comes from storage and cannot be clobbered by a partial copy.
    const flow = await this.loadFlow(id);

    if (updates.title !== undefined) flow.title = updates.title;
    if (updates.description !== undefined) flow.metadata.description = updates.description;
    if (updates.tags !== undefined) flow.metadata.tags = updates.tags;

    flow.metadata.updatedAt = new Date().toISOString();
    await this.saveFlow(flow);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validateFlow(flow: any): SavedFlow | null {
    return validateFlow(flow);
  }

  async isValidFlowFile(file: File): Promise<boolean> {
    return isValidFlowFile(file);
  }

  private saveToStorage(flows: SavedFlow[]): void {
    const data = JSON.stringify(flows);
    const size = new Blob([data]).size;
    
    if (size > this.MAX_STORAGE_SIZE) {
      throw new StorageError(
        `Storage quota would be exceeded. Current size: ${Math.round(size / 1024)}KB, Limit: ${Math.round(this.MAX_STORAGE_SIZE / 1024)}KB`,
        'QUOTA_EXCEEDED'
      );
    }
    
    try {
      localStorage.setItem(this.STORAGE_KEY, data);
    } catch (error) {
      // A quota failure arrives as a DOMException, which is an Error subclass.
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new StorageError(
          'Browser storage quota exceeded. Please delete some saved flows.',
          'QUOTA_EXCEEDED'
        );
      }
      throw new StorageError(`Failed to save to storage: ${errorMessage(error)}`);
    }
  }
}