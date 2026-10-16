import { useCallback, useEffect, useState } from 'react';
import { bugService } from '../services/api.js';

/**
 * Fetch a list of bugs with optional filters.
 * Returns { bugs, loading, error, refetch }.
 */
export function useBugs(filters = {}) {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const serialized = JSON.stringify(filters);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bugService.list(JSON.parse(serialized));
      setBugs(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [serialized]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { bugs, loading, error, refetch };
}
