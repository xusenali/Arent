import { useAuthStore } from '../store/authStore.js'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

function extractErrorMessage(data, fallback) {
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail
  const firstFieldErrors = Object.values(data).find((v) => Array.isArray(v) && v.length)
  if (firstFieldErrors) return firstFieldErrors[0]
  return fallback
}

let _refreshPromise = null

async function tryRefresh() {
  const { refreshToken, setAccessToken, logout } = useAuthStore.getState()
  if (!refreshToken) { logout(); return null }

  if (_refreshPromise) return _refreshPromise

  _refreshPromise = fetch(`${BASE_URL}/api/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken }),
  })
    .then(async (r) => {
      if (!r.ok) { logout(); return null }
      const data = await r.json()
      setAccessToken(data.access)
      return data.access
    })
    .catch(() => { logout(); return null })
    .finally(() => { _refreshPromise = null })

  return _refreshPromise
}

export async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  const isFormData = body instanceof FormData

  if (!isFormData && body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth) {
    const token = useAuthStore.getState().accessToken
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Token expired — try refresh once
  if (response.status === 401 && auth) {
    const newToken = await tryRefresh()
    if (newToken) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` }
      const retry = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: retryHeaders,
        body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      })
      const retryType = retry.headers.get('content-type') ?? ''
      const retryData = retryType.includes('application/json') ? await retry.json().catch(() => null) : null
      if (!retry.ok) {
        throw new ApiError(extractErrorMessage(retryData, "So'rovni bajarishda xatolik yuz berdi"), retry.status, retryData)
      }
      return retryData
    }
    // Refresh failed — logout already called in tryRefresh
    throw new ApiError("Sessiya muddati tugadi. Qayta kiring.", 401, null)
  }

  const contentType = response.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json') ? await response.json().catch(() => null) : null

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data, "So'rovni bajarishda xatolik yuz berdi"), response.status, data)
  }

  return data
}
