import i18n from '../i18n/index.js'
import { useAuthStore } from '../store/authStore.js'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// Oddiy so'rov uchun yetarli. Login uchun alohida (uzunroq) qiymat beriladi —
// Render bepul tarifida uxlab qolgan server 30-60 soniyada uyg'onadi.
const DEFAULT_TIMEOUT_MS = 30_000

class ApiError extends Error {
  constructor(message, status, data, code) {
    super(message)
    this.status = status
    this.data = data
    this.code = code // 'timeout' | 'network' | undefined
  }
}

function extractErrorMessage(data, fallback) {
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail
  const firstFieldErrors = Object.values(data).find((v) => Array.isArray(v) && v.length)
  if (firstFieldErrors) return firstFieldErrors[0]
  return fallback
}

/**
 * `fetch` + timeout. Timeout'siz `fetch` server javob bermasa brauzer
 * o'zi voz kechguncha (bir necha daqiqa) kutadi — spinner cheksiz aylanadi.
 * Tarmoq xatosi va timeout foydalanuvchiga tushunarli ApiError bo'lib qaytadi.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(i18n.t('auth.timeout_error'), 0, null, 'timeout')
    }
    throw new ApiError(i18n.t('auth.network_error'), 0, null, 'network')
  } finally {
    clearTimeout(timer)
  }
}

let _wakePromise = null

/**
 * Serverni oldindan uyg'otadi (login sahifasi ochilganda chaqiriladi):
 * foydalanuvchi raqam va parolni yozguncha Render uyg'onib ulguradi.
 * Xatolar yutiladi — bu faqat "isitish".
 */
export function wakeBackend() {
  if (!_wakePromise) {
    _wakePromise = fetchWithTimeout(`${BASE_URL}/health/`, {}, 90_000)
      .catch(() => null)
      .finally(() => {
        // Keyingi sahifa ochilishida yana isitish mumkin bo'lsin.
        setTimeout(() => { _wakePromise = null }, 60_000)
      })
  }
  return _wakePromise
}

let _refreshPromise = null

async function tryRefresh() {
  const { refreshToken, setAccessToken, logout } = useAuthStore.getState()
  if (!refreshToken) { logout(); return null }

  if (_refreshPromise) return _refreshPromise

  _refreshPromise = fetchWithTimeout(`${BASE_URL}/api/auth/refresh-token`, {
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
    // Tarmoq/timeout xatosida sessiyani o'chirmaymiz — internet qaytgach
    // foydalanuvchi qayta login qilmasdan davom etishi mumkin.
    .catch((err) => {
      if (!err?.code) logout()
      return null
    })
    .finally(() => { _refreshPromise = null })

  return _refreshPromise
}

async function readJson(response) {
  const contentType = response.headers.get('content-type') ?? ''
  return contentType.includes('application/json') ? response.json().catch(() => null) : null
}

export async function apiRequest(
  path,
  { method = 'GET', body, auth = true, timeoutMs = DEFAULT_TIMEOUT_MS } = {},
) {
  const headers = {}
  const isFormData = body instanceof FormData

  if (!isFormData && body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth) {
    const token = useAuthStore.getState().accessToken
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const payload = isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined

  const response = await fetchWithTimeout(`${BASE_URL}${path}`, { method, headers, body: payload }, timeoutMs)

  // Token expired — try refresh once
  if (response.status === 401 && auth) {
    const newToken = await tryRefresh()
    if (newToken) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` }
      const retry = await fetchWithTimeout(
        `${BASE_URL}${path}`, { method, headers: retryHeaders, body: payload }, timeoutMs,
      )
      const retryData = await readJson(retry)
      if (!retry.ok) {
        throw new ApiError(extractErrorMessage(retryData, "So'rovni bajarishda xatolik yuz berdi"), retry.status, retryData)
      }
      return retryData
    }
    // Refresh failed — logout already called in tryRefresh
    throw new ApiError("Sessiya muddati tugadi. Qayta kiring.", 401, null)
  }

  const data = await readJson(response)

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data, "So'rovni bajarishda xatolik yuz berdi"), response.status, data)
  }

  return data
}
