import { apiRequest } from './client.js'

export function fetchPublicUnits() {
  return apiRequest('/api/public/units', { auth: false }).then((data) => data.results ?? data)
}

export function fetchPublicRules(lang = 'uz') {
  return apiRequest(`/api/public/rules?lang=${lang}`, { auth: false }).then((data) => data.results ?? data)
}
