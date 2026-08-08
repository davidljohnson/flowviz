import { LocalStorageService } from './LocalStorageService';
import { ApiFlowStorage } from './ApiFlowStorage';
import { type IFlowStorage } from './StorageInterface';

export { LocalStorageService } from './LocalStorageService';
export { ApiFlowStorage } from './ApiFlowStorage';
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
 * Which backend is decided by build configuration rather than by the signed-in
 * user, so it is settled before the first render and cannot change underneath a
 * dialog mid-session. An instance with accounts always stores server-side; a
 * signed-out visitor there simply has an empty library until they sign in.
 */
export const flowStorage: IFlowStorage = import.meta.env.VITE_SUPABASE_URL
  ? new ApiFlowStorage()
  : new LocalStorageService();
export { type SavedFlow, type ImportResult } from '../types/SavedFlow';