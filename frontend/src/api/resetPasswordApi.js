import { apiRequest } from './client.js'
import { normalizePhone } from '../utils/formatPhone.js'

export function requestOtp({ phone }) {
  return apiRequest('/api/auth/reset-password/request', {
    method: 'POST',
    auth: false,
    body: { phone: normalizePhone(phone) },
  })
}

export function verifyOtp({ phone, code }) {
  return apiRequest('/api/auth/reset-password/verify-otp', {
    method: 'POST',
    auth: false,
    body: { phone: normalizePhone(phone), code },
  })
}

export function confirmNewPassword({ phone, code, newPassword }) {
  return apiRequest('/api/auth/reset-password/confirm', {
    method: 'POST',
    auth: false,
    body: { phone: normalizePhone(phone), code, new_password: newPassword },
  })
}
