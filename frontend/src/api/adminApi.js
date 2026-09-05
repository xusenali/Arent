import { apiRequest } from './client.js'

export function fetchDashboardStats() {
  return apiRequest('/api/admin/dashboard/stats')
}

export function fetchWorkers(status) {
  const query = status ? `?status=${status}` : ''
  return apiRequest(`/api/admin/workers${query}`).then((data) => data.results ?? data)
}

export function fetchWorkerDetail(id) {
  return apiRequest(`/api/admin/workers/${id}`)
}

export function updateWorker(id, payload) {
  return apiRequest(`/api/admin/workers/${id}`, { method: 'PATCH', body: payload })
}

export function deleteWorker(id) {
  return apiRequest(`/api/admin/workers/${id}`, { method: 'DELETE' })
}

export function approveWorker(id) {
  return apiRequest(`/api/admin/workers/${id}/approve`, { method: 'POST' })
}

export function fetchWorkerPayments(id) {
  return apiRequest(`/api/admin/workers/${id}/payments`).then((data) => data.results ?? data)
}

export function fetchWorkerRentalMedia(id) {
  return apiRequest(`/api/admin/workers/${id}/rental-media`).then((data) => data.results ?? data)
}

export function uploadWorkerDocument(id, formData) {
  return apiRequest(`/api/admin/workers/${id}/documents`, { method: 'POST', body: formData })
}

export function deleteWorkerDocument(id, type) {
  return apiRequest(`/api/admin/workers/${id}/documents?type=${type}`, { method: 'DELETE' })
}

export function fetchAdminLocations() {
  return apiRequest('/api/admin/locations')
}

export function fetchPaymentReceipts(status) {
  const query = status ? `?status=${status}` : ''
  return apiRequest(`/api/admin/payment-receipts${query}`).then((data) => data.results ?? data)
}

export function approvePaymentReceipt(id, amount) {
  return apiRequest(`/api/admin/payment-receipts/${id}/approve`, {
    method: 'POST',
    body: amount ? { amount } : undefined,
  })
}

export function rejectPaymentReceipt(id) {
  return apiRequest(`/api/admin/payment-receipts/${id}/reject`, { method: 'POST' })
}

export function fetchUpcomingPayments() {
  return apiRequest('/api/admin/upcoming-payments').then((data) => data.results ?? data)
}

export function recordCashPayment(rentalId, amount) {
  return apiRequest('/api/admin/cash-payment', { method: 'POST', body: { rental_id: rentalId, amount } })
}

export function fetchAdminUnits() {
  return apiRequest('/api/admin/units').then((data) => data.results ?? data)
}

export function createAdminUnit(formData) {
  return apiRequest('/api/admin/units', { method: 'POST', body: formData })
}

export function updateAdminUnit(id, formData) {
  return apiRequest(`/api/admin/units/${id}`, { method: 'PATCH', body: formData })
}

export function deleteAdminUnit(id) {
  return apiRequest(`/api/admin/units/${id}`, { method: 'DELETE' })
}
