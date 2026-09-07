import { apiRequest } from './client.js'
import { normalizePhone } from '../utils/formatPhone.js'

export function fetchPublicUnits() {
  return apiRequest('/api/public/units', { auth: false }).then((data) => data.results ?? data)
}

export function fetchPublicRules(lang = 'uz') {
  return apiRequest(`/api/public/rules?lang=${lang}`, { auth: false }).then((data) => data.results ?? data)
}

/**
 * Ishchi bo'lib ro'yxatdan o'tish — admin tasdig'i kutilmaydi.
 * Javobda JWT keladi, shuning uchun foydalanuvchi darhol tizimga kiradi.
 */
export function registerWorker({ fullName, phone, password, unitId, periodType, payTiming, batteryCount }) {
  return apiRequest('/api/public/worker-register', {
    method: 'POST',
    auth: false,
    body: {
      full_name:     fullName,
      phone:         normalizePhone(phone),
      password,
      unit:          unitId       || null,
      period_type:   periodType   || 'weekly',
      pay_timing:    payTiming    || 'start',
      battery_count: batteryCount || null,
    },
  }).then((data) => ({
    user:         data.user,
    accessToken:  data.access,
    refreshToken: data.refresh,
  }))
}
