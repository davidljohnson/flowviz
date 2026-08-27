import { LocalStorageService } from './LocalStorageService';
import { type IFlowStorage } from './StorageInterface';

export { LocalStorageService } from './LocalStorageService';
export { type IFlowStorage, StorageError } from './StorageInterface';

/**
 * The shared storage instance.
 *
 * The class holds three readonly constants and no mutable state, so there is
 * nothing for separate instances to disagree about — which is why both dialogs
 * were quietly constructing one on every render, and the save dialog managed to
 * construct a second one inside an effect and use that instead of the field it
 * had already made. One instance makes that impossible to repeat.
 *
 * Flows live in the browser that made them, which is why this is the only
 * implementation. A shared instance where several people see one library would
 * need a server-side store behind the same interface, and a server with
 * somewhere to put it; neither exists here, and export is how a flow moves
 * between people today.
 */
export const flowStorage: IFlowStorage = new LocalStorageService();
export { type SavedFlow, type ImportResult } from '../types/SavedFlow';