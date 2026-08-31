import { apiRequest } from './client.js'
import { normalizePhone } from '../utils/formatPhone.js'

export function submitWorkerApplication({ fullName, phone, desiredUnitModel }) {
  return apiRequest('/api/public/worker-applications', {
    method: 'POST',
    auth: false,
    body: {
      full_name: fullName,
      phone: normalizePhone(phone),
      desired_unit_model: desiredUnitModel || null,
    },
  })
}
