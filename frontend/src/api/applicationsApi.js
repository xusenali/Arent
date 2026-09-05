import { apiRequest } from './client.js'
import { normalizePhone } from '../utils/formatPhone.js'

export function submitWorkerApplication({ fullName, phone, desiredUnitModel, unitId, period_type, pay_timing, battery_count }) {
  return apiRequest('/api/public/worker-applications', {
    method: 'POST',
    auth: false,
    body: {
      full_name:           fullName,
      phone:               normalizePhone(phone),
      desired_unit_model:  desiredUnitModel  || null,
      unit:                unitId            || null,
      period_type:         period_type       || 'weekly',
      pay_timing:          pay_timing        || 'start',
      battery_count:       battery_count     || null,
    },
  })
}

export function fetchAdminApplications(status = 'pending') {
  return apiRequest(`/api/admin/applications?status=${status}`).then((d) => d.results ?? d)
}

export function approveApplication(id) {
  return apiRequest(`/api/admin/applications/${id}/approve`, { method: 'POST' })
}

export function rejectApplication(id) {
  return apiRequest(`/api/admin/applications/${id}/reject`, { method: 'POST' })
}
