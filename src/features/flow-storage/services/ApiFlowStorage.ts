import { SavedFlow, ImportResult } from '../types/SavedFlow';
import { IFlowStorage, StorageError } from './StorageInterface';
import { apiFetch } from '../../../shared/services/api/apiClient';
import {
  validateFlow,
  isValidFlowFile,
  flowToBlob,
  flowsToBlob,
} from './flowValidation';

/**
 * Server-backed flow library.
 *
 * The same interface localStorage implements, over `/v1/flows`. Every dialog
 * and hook that reads or writes flows goes through IFlowStorage, so nothing
 * above this layer changes when the library moves off the device.
 *
 * listFlows() returns summaries — real records with empty node and edge arrays,
 * because the list view renders titles and counts and has no use for graphs
 * that can run to megabytes. Anything that needs the graph calls loadFlow().
 */
export class ApiFlowStorage implements IFlowStorage {
  private readonly EXPORTED_BY = 'FlowViz';

  /**
   * Turns a non-OK response into a StorageError carrying the code callers
   * already switch on, so API failures surface the same way quota failures do.
   */
  private async fail(response: Response, fallback: string): Promise<never> {
    let message = fallback;
    let code: ConstructorParameters<typeof StorageError>[1] = 'UNKNOWN';

    try {
      const body = await response.json();
      if (body?.message) message = body.message;
      if (body?.error === 'invalid_flow') code = 'INVALID_FORMAT';
      if (body?.error === 'id_taken') code = 'DUPLICATE';
    } catch {
      // A non-JSON body (a proxy error page, say) leaves the fallback in place.
    }

    if (response.status === 404) code = 'NOT_FOUND';
    if (response.status === 401) message = 'Sign in to use your flow library';
    if (response.status === 413) code = 'QUOTA_EXCEEDED';

    throw new StorageError(message, code);
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    try {
      return await apiFetch(path, init);
    } catch (error) {
      // fetch() rejects only on network failure; HTTP errors are handled above.
      throw new StorageError(
        `Could not reach the server: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private json(body: unknown): RequestInit {
    return {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    };
  }

  async saveFlow(flow: SavedFlow): Promise<void> {
    // Counts and timestamp are recomputed server-side; sending them keeps a
    // locally-held copy consistent for callers that reuse the object.
    flow.metadata.updatedAt = new Date().toISOString();
    flow.metadata.nodeCount = flow.nodes.length;
    flow.metadata.edgeCount = flow.edges.length;

    const response = await this.request(`/v1/flows/${flow.id}`, {
      method: 'PUT',
      ...this.json(flow),
    });

    if (!response.ok) await this.fail(response, 'Could not save that analysis');
  }

  async loadFlow(id: string): Promise<SavedFlow> {
    const response = await this.request(`/v1/flows/${id}`);
    if (!response.ok) await this.fail(response, `Flow with ID ${id} not found`);

    const flow = validateFlow(await response.json());
    if (!flow) throw new StorageError('Server returned a malformed flow', 'INVALID_FORMAT');

    return flow;
  }

  async listFlows(): Promise<SavedFlow[]> {
    const response = await this.request('/v1/flows');

    // An unauthenticated visitor has no library rather than a broken one, so
    // the list renders empty instead of throwing into the dialog.
    if (response.status === 401) return [];
    if (!response.ok) await this.fail(response, 'Could not load your analyses');

    const { flows } = await response.json();
    return (flows as unknown[])
      .map((flow) => validateFlow(flow))
      .filter((flow): flow is SavedFlow => flow !== null);
  }

  async deleteFlow(id: string): Promise<void> {
    const response = await this.request(`/v1/flows/${id}`, { method: 'DELETE' });
    if (!response.ok) await this.fail(response, `Flow with ID ${id} not found`);
  }

  async deleteMultiple(ids: string[]): Promise<void> {
    // Sequential rather than concurrent: a bulk delete is rare and small, and
    // serializing keeps a slip from firing a burst at the rate limiter.
    for (const id of ids) {
      await this.deleteFlow(id);
    }
  }

  async duplicateFlow(id: string, newTitle?: string): Promise<SavedFlow> {
    const response = await this.request(`/v1/flows/${id}/duplicate`, {
      method: 'POST',
      ...this.json({ title: newTitle }),
    });

    if (!response.ok) await this.fail(response, 'Could not duplicate that analysis');

    const flow = validateFlow(await response.json());
    if (!flow) throw new StorageError('Server returned a malformed flow', 'INVALID_FORMAT');

    return flow;
  }

  async searchFlows(query: string): Promise<SavedFlow[]> {
    const params = new URLSearchParams({ search: query });
    const response = await this.request(`/v1/flows?${params}`);

    if (response.status === 401) return [];
    if (!response.ok) await this.fail(response, 'Search failed');

    const { flows } = await response.json();
    return (flows as unknown[])
      .map((flow) => validateFlow(flow))
      .filter((flow): flow is SavedFlow => flow !== null);
  }

  async getFlowsByTags(tags: string[]): Promise<SavedFlow[]> {
    const params = new URLSearchParams({ tags: tags.join(',') });
    const response = await this.request(`/v1/flows?${params}`);

    if (response.status === 401) return [];
    if (!response.ok) await this.fail(response, 'Could not filter by tag');

    const { flows } = await response.json();
    return (flows as unknown[])
      .map((flow) => validateFlow(flow))
      .filter((flow): flow is SavedFlow => flow !== null);
  }

  async exportFlow(id: string, _filename?: string): Promise<Blob> {
    return flowToBlob(await this.loadFlow(id), this.EXPORTED_BY);
  }

  async exportAllFlows(): Promise<Blob> {
    // The list carries no graphs, so a real export has to fetch each one.
    const summaries = await this.listFlows();
    const flows = await Promise.all(summaries.map((summary) => this.loadFlow(summary.id)));
    return flowsToBlob(flows, this.EXPORTED_BY);
  }

  async importFlow(file: File): Promise<SavedFlow> {
    try {
      const flow = validateFlow(JSON.parse(await file.text()));
      if (!flow) throw new Error('Invalid flow format');

      // A fresh id, so importing a file exported from this same account adds a
      // copy rather than overwriting the original.
      flow.id = crypto.randomUUID();
      flow.metadata.updatedAt = new Date().toISOString();

      await this.saveFlow(flow);
      return flow;
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(
        `Failed to import flow: ${error instanceof Error ? error.message : String(error)}`,
        'INVALID_FORMAT'
      );
    }
  }

  async importFlows(files: FileList): Promise<ImportResult> {
    const result: ImportResult = { success: [], failed: [], duplicates: [] };

    for (const file of Array.from(files)) {
      try {
        const data = JSON.parse(await file.text());

        // Bulk exports carry a `flows` array; anything else is a single flow.
        const candidates = Array.isArray(data.flows) ? data.flows : [data];

        if (!candidates.length) {
          result.failed.push({ filename: file.name, error: 'No flows found in that file' });
          continue;
        }

        for (const candidate of candidates) {
          const flow = validateFlow(candidate);
          if (!flow) {
            result.failed.push({
              filename: file.name,
              error: `Invalid flow format for flow: ${candidate?.title || 'Unknown'}`,
            });
            continue;
          }

          try {
            flow.id = crypto.randomUUID();
            flow.metadata.updatedAt = new Date().toISOString();
            await this.saveFlow(flow);
            result.success.push(flow);
          } catch (error) {
            result.failed.push({
              filename: file.name,
              error: `Failed to import flow: ${error instanceof Error ? error.message : String(error)}`,
            });
          }
        }
      } catch (error) {
        result.failed.push({
          filename: file.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  async clearAllFlows(): Promise<void> {
    const flows = await this.listFlows();
    await this.deleteMultiple(flows.map((flow) => flow.id));
  }

  async updateFlowDetails(
    id: string,
    updates: { title?: string; description?: string; tags?: string[] }
  ): Promise<void> {
    const response = await this.request(`/v1/flows/${id}`, {
      method: 'PATCH',
      ...this.json(updates),
    });

    if (!response.ok) await this.fail(response, 'Could not save those details');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validateFlow(flow: any): SavedFlow | null {
    return validateFlow(flow);
  }

  async isValidFlowFile(file: File): Promise<boolean> {
    return isValidFlowFile(file);
  }
}
