import useOnlineStatus from '../hooks/useOnlineStatus';
import { useState, useEffect } from 'react';
import { getPendingCrops } from '../services/offlineDB';
import { attemptSync } from '../services/syncService';
import { WifiOff, Upload, Loader2, CheckCircle2 } from 'lucide-react';

export default function SyncIndicator() {
  const online = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getPendingCrops().then(c => setPendingCount(c.length)).catch(() => {});
  }, [syncing]);

  useEffect(() => {
    if (online && pendingCount > 0) {
      doSync();
    }
  }, [online]);

  async function doSync() {
    setSyncing(true);
    setMessage('Syncing...');
    const result = await attemptSync();
    if (result.synced && result.count > 0) {
      setMessage(`${result.count} crop(s) synced!`);
      setPendingCount(0);
    } else if (!result.synced) {
      setMessage('Sync failed. Will retry.');
    } else {
      setMessage('');
    }
    setSyncing(false);
    setTimeout(() => setMessage(''), 4000);
  }

  if (pendingCount === 0 && !message) return null;

  return (
    <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 
      rounded-2xl p-4 shadow-float animate-slide-up backdrop-blur-lg
      ${online
        ? 'bg-emerald-50/90 text-emerald-800 border border-emerald-200/60'
        : 'bg-amber-50/90 text-amber-800 border border-amber-200/60'
      }`}>
      {!online && pendingCount > 0 && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <WifiOff className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-sm">You're offline</p>
            <p className="text-xs opacity-80">{pendingCount} crop(s) saved locally — will sync when online</p>
          </div>
        </div>
      )}
      {online && pendingCount > 0 && !syncing && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">{pendingCount} pending crop(s)</p>
              <p className="text-xs opacity-80">Ready to sync to server</p>
            </div>
          </div>
          <button onClick={doSync} className="btn btn-primary text-xs py-2 px-4">Sync Now</button>
        </div>
      )}
      {syncing && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
          </div>
          <p className="font-semibold text-sm">Syncing...</p>
        </div>
      )}
      {message && !syncing && (
        <div className="flex items-center gap-2 mt-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="font-semibold text-sm">{message}</p>
        </div>
      )}
    </div>
  );
}
