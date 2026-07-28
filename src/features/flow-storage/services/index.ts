import { LocalStorageService } from './LocalStorageService';

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
 */
export const flowStorage = new LocalStorageService();
export { type SavedFlow, type ImportResult } from '../types/SavedFlow';