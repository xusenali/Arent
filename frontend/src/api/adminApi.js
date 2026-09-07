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

export function fetchWorkerRental(id) {
  return apiRequest(`/api/admin/workers/${id}/rental`)
}

export function fetchWorkerRentalMedia(id) {
  return apiRequest(`/api/admin/workers/${id}/rental-media`).then((data) => data.results ?? data)
}

export function adminEndRental(id) {
  return apiRequest(`/api/admin/workers/${id}/rental/end`, { method: 'POST' })
}

export function fetchArchivedWorkers() {
  return apiRequest('/api/admin/workers/archive').then((d) => d.results ?? d)
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

/**
 * Chekni tasdiqlash. Admin olingan summani va necha kunga amal qilishini kiritadi.
 * @param {string} id      chek id
 * @param {object} payload { amount, days, note? }
 */
export function approvePaymentReceipt(id, { amount, days, note = '' }) {
  return apiRequest(`/api/admin/payment-receipts/${id}/approve`, {
    method: 'POST',
    body: { amount: String(amount), days, note },
  })
}

export function rejectPaymentReceipt(id, reason = '') {
  return apiRequest(`/api/admin/payment-receipts/${id}/reject`, {
    method: 'POST',
    body: { reason },
  })
}

/** "Naqd oldim" — admin qo'lda to'lov yozadi: summa + necha kunga amal qiladi. */
export function recordCashPayment(rentalId, { amount, days, note = '' }) {
  return apiRequest('/api/admin/cash-payment', {
    method: 'POST',
    body: { rental_id: rentalId, amount: String(amount), days, note },
  })
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

// ─── to'lov kartasi (ishchilar shu raqamga pul o'tkazadi) ────────────────────

export function fetchPaymentCard() {
  return apiRequest('/api/admin/payment-card')
}

export function savePaymentCard({ number, holder = '', bank = '' }) {
  return apiRequest('/api/admin/payment-card', {
    method: 'PUT',
    body: { number, holder, bank },
  })
}
