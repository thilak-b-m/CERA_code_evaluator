import { useEffect, useState } from 'react';
import { liveLabService } from '../services/liveLabService.js';

const REFRESH_INTERVAL_MS = 5000;

export function useLiveLabSessions(token) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [secureAssessments, setSecureAssessments] = useState([]);
  const [secureError, setSecureError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const latest = await liveLabService.listSessions(token);
        if (cancelled) return;
        setSessions(latest);
        setError('');
        setLastUpdated(new Date());
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Unable to refresh live lab sessions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
      try {
        const attempts = await liveLabService.listSecureAssessments(token);
        if (!cancelled) {
          setSecureAssessments(attempts);
          setSecureError('');
        }
      } catch (loadError) {
        if (!cancelled) setSecureError(loadError.message || 'Unable to refresh secure assessment activity.');
      }
    };

    refresh();
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token]);

  return {
    sessions,
    loading,
    error,
    lastUpdated,
    connected: !error && lastUpdated !== null,
    secureAssessments,
    secureError,
  };
}
