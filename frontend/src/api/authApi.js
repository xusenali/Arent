import { apiRequest } from './client.js'
import { normalizePhone } from '../utils/formatPhone.js'

export function loginRequest({ phone, password }) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: { phone: normalizePhone(phone), password },
  }).then((data) => ({
    user: data.user,
    accessToken: data.access,
    refreshToken: data.refresh,
  }))
}
