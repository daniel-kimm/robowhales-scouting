import React, { useEffect, useState, useCallback } from 'react';
import { subscribe, flushQueue } from '../utils/offlineQueue';
import './PendingSubmissionsBanner.css';

function PendingSubmissionsBanner() {
  const [queue, setQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isRetrying, setIsRetrying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    const unsub = subscribe(setQueue);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      unsub();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleRetry = useCallback(async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    setLastResult(null);
    try {
      const result = await flushQueue();
      setLastResult(result);
    } catch (err) {
      setLastResult({ error: err.message || String(err) });
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying]);

  if (queue.length === 0 && isOnline) return null;

  const status = !isOnline
    ? 'offline'
    : queue.length > 0
    ? 'pending'
    : 'online';

  return (
    <div className={`pending-banner pending-banner--${status}`}>
      <div className="pending-banner__row">
        <div className="pending-banner__main">
          <span className="pending-banner__dot" />
          <strong>
            {!isOnline && 'Offline'}
            {isOnline && queue.length > 0 && `${queue.length} submission${queue.length === 1 ? '' : 's'} waiting to upload`}
            {isOnline && queue.length === 0 && 'Online'}
          </strong>
          {queue.length > 0 && (
            <span className="pending-banner__sub">
              Saved on this device. Will upload automatically when online.
            </span>
          )}
        </div>
        <div className="pending-banner__actions">
          {queue.length > 0 && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying || !isOnline}
              className="pending-banner__btn"
            >
              {isRetrying ? 'Uploading…' : 'Retry now'}
            </button>
          )}
          {queue.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="pending-banner__btn pending-banner__btn--ghost"
            >
              {expanded ? 'Hide' : 'Details'}
            </button>
          )}
        </div>
      </div>

      {lastResult && !lastResult.error && (
        <div className="pending-banner__result">
          Uploaded {lastResult.ok}, {lastResult.remaining} still pending.
        </div>
      )}
      {lastResult && lastResult.error && (
        <div className="pending-banner__result pending-banner__result--error">
          Retry failed: {lastResult.error}
        </div>
      )}

      {expanded && queue.length > 0 && (
        <ul className="pending-banner__list">
          {queue.map((entry) => {
            const team = entry.data?.matchInfo?.teamNumber || '?';
            const match = entry.data?.matchInfo?.matchNumber || '?';
            const created = new Date(entry.createdAt).toLocaleTimeString();
            return (
              <li key={entry.id} className="pending-banner__item">
                <span>
                  Team <strong>{team}</strong>, Match <strong>{match}</strong>
                </span>
                <span className="pending-banner__meta">
                  saved {created}
                  {entry.attempts > 0 && ` · ${entry.attempts} retr${entry.attempts === 1 ? 'y' : 'ies'}`}
                  {entry.lastError && ` · ${entry.lastError}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default PendingSubmissionsBanner;
