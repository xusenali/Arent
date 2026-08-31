import { apiRequest } from './client.js'

export function fetchWorkerDashboard() {
  return apiRequest('/api/worker/dashboard')
}

export function uploadPaymentReceipt({ file }) {
  const formData = new FormData()
  formData.append('receipt_image', file)
  return apiRequest('/api/worker/payment-receipts', { method: 'POST', body: formData })
}

export function fetchWorkerRules(lang = 'uz') {
  return apiRequest(`/api/worker/rules?lang=${lang}`).then((data) => data.results ?? data)
}
