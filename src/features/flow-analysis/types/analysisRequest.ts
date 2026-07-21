/**
 * One request to analyse a report.
 *
 * Analysis used to be triggered by mounting the visualization with a `url`
 * prop, which made it a one-shot entry action: the same URL couldn't be run
 * twice, and a guard ref that was only cleared on a full canvas reset blocked
 * any second run. Making the request an explicit value with its own id turns
 * analysis into something you can invoke repeatedly over a live canvas.
 */
export interface AnalysisRequest {
  /** Fresh per submission — re-analysing the same input still re-triggers. */
  id: string;
  /** URL or raw article text; the client decides which by sniffing for http(s). */
  input: string;
  /**
   * 'merge' keeps the existing graph and appends the new one below it.
   * 'replace' clears the canvas first, which is the historic behaviour.
   */
  mode: 'merge' | 'replace';
  provider?: string;
  model?: string;
}
