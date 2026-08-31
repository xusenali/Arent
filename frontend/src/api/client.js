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
  const firstFieldErrors = Object.values(data).find((value) => Array.isArray(value) && value.length)
  if (firstFieldErrors) return firstFieldErrors[0]
  return fallback
}

/**
 * @param {string} path - masalan '/api/auth/login'
 * @param {{ method?: string, body?: object|FormData, auth?: boolean }} options
 */
export async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  const isFormData = body instanceof FormData

  if (!isFormData && body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth) {
    const accessToken = useAuthStore.getState().accessToken
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401 && auth) {
    useAuthStore.getState().logout()
  }

  const contentType = response.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json') ? await response.json().catch(() => null) : null

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data, "So'rovni bajarishda xatolik yuz berdi"), response.status, data)
  }

  return data
}
