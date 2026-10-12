import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../services/api.js';

// Small data-loading hook: { data, loading, error, reload }
export default function useFetch(url, params, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: '' });
  const key = JSON.stringify([url, params]);

  const load = useCallback(() => {
    if (!enabled || !url) return Promise.resolve();
    setState((s) => ({ ...s, loading: true, error: '' }));
    return api.get(url, { params })
      .then((r) => setState({ data: r.data, loading: false, error: '' }))
      .catch((e) => setState({ data: null, loading: false, error: errMsg(e) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}
