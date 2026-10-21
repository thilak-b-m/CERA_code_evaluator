const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  constructor(message, status, body = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = status;
    this.body = body;
  }
}

async function request(path, options = {}) {
  const { token, headers, body, ...fetchOptions } = options;
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...fetchOptions,
    headers: requestHeaders,
    body: body === undefined || typeof body === 'string'
      ? body
      : JSON.stringify(body),
  });

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiError('The API returned an unexpected response.', response.status);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new ApiError('The API returned invalid JSON.', response.status);
  }

  if (!response.ok) {
    throw new ApiError(
      result.message || result.error || 'The API request failed.',
      response.status,
      result,
    );
  }

  return result;
}

export const api = { request };