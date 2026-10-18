import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from './api';

// Small data-loading hook: const { data, loading, error, reload } = useFetch('/students')
export default function useFetch(url, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async (silent = false) => {
    if (!url) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.get(url);
      setData(res.data);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => { reload(); }, [reload]);

  return { data, setData, loading, error, reload };
}
