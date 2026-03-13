import { getPendingCrops, clearPendingCrops } from './offlineDB';
import { syncCrops as syncCropsAPI } from './api';

export async function attemptSync() {
  if (!navigator.onLine) return { synced: false, count: 0 };

  const pending = await getPendingCrops();
  if (pending.length === 0) return { synced: true, count: 0 };

  try {
    const cleaned = pending.map(({ localId, ...rest }) => rest);
    await syncCropsAPI(cleaned);
    await clearPendingCrops();
    return { synced: true, count: pending.length };
  } catch {
    return { synced: false, count: pending.length };
  }
}
