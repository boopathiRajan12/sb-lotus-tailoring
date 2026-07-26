// Thin fetch wrapper: always sends the session cookie, always speaks JSON
// (except when sending FormData for file uploads), and throws a normalized
// Error (with the server's message, when present) on non-2xx responses.

async function request(path, { method = 'GET', body, isFormData = false } = {}) {
  const options = {
    method,
    credentials: 'include',
    headers: {},
  }

  if (body !== undefined) {
    if (isFormData) {
      options.body = body
    } else {
      options.headers['Content-Type'] = 'application/json'
      options.body = JSON.stringify(body)
    }
  }

  const res = await fetch(path, options)
  const contentType = res.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await res.json() : null

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `Request failed (${res.status})`
    const error = new Error(message)
    error.status = res.status
    error.data = data
    throw error
  }

  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body, opts = {}) => request(path, { method: 'POST', body, ...opts }),
  put: (path, body, opts = {}) => request(path, { method: 'PUT', body, ...opts }),
  del: (path) => request(path, { method: 'DELETE' }),
}
