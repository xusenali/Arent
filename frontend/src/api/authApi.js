import { apiRequest } from './client.js'
import { normalizePhone } from '../utils/formatPhone.js'

export function loginRequest({ phone, password }) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: { phone: normalizePhone(phone), password },
    // Uxlab qolgan server uyg'onishiga vaqt beramiz (Render bepul tarifi).
    timeoutMs: 90_000,
  }).then((data) => ({
    user: data.user,
    accessToken: data.access,
    refreshToken: data.refresh,
  }))
}
