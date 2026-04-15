/**
 * Human-readable message from axios error (shows API `error` detail when present).
 */
export function getApiErrorMessage(err, fallback = 'Something went wrong') {
  const status = err.response?.status;
  const data = err.response?.data;

  if (!data) {
    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
      return 'Cannot reach the server. Start the backend (port 5000) and check REACT_APP_API_URL.';
    }
    return err.message || fallback;
  }

  if (typeof data === 'string') {
    const trimmed = data.replace(/<[^>]+>/g, ' ').trim();
    return trimmed.slice(0, 280) || (status ? `HTTP ${status}` : fallback);
  }

  const parts = [];
  if (data.message) parts.push(String(data.message));
  if (data.error && String(data.error) !== String(data.message)) parts.push(String(data.error));
  if (parts.length) {
    return parts.join(': ');
  }
  if (status) {
    return `${fallback} (HTTP ${status})`;
  }
  return fallback;
}
