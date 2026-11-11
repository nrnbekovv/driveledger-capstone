let csrfToken = '';
export async function api(path, data) {
  if (data !== undefined && !csrfToken) await api('/djangoapp/session');
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...(data === undefined ? {} : {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
      body: JSON.stringify(data)
    })
  });
  let result;
  try { result = await response.json(); } catch { throw new Error('The server returned an unexpected response. Please try again.'); }
  if (result.csrfToken) csrfToken = result.csrfToken;
  if (!response.ok) throw new Error(result.error || 'Request failed (' + response.status + ').');
  return result;
}
