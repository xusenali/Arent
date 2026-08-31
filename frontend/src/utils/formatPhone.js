export function formatPhone(value) {
  const digits = value.replace(/\D/g, '').replace(/^998/, '').slice(0, 9)

  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 7),
    digits.slice(7, 9),
  ].filter(Boolean)

  return parts.length ? `+998 ${parts.join(' ')}` : ''
}

export function isValidPhone(value) {
  return /^\+998 \d{2} \d{3} \d{2} \d{2}$/.test(value)
}

/** Backend'ga yuborishdan oldin: "+998 90 123 45 67" -> "+998901234567" */
export function normalizePhone(value) {
  return `+${value.replace(/\D/g, '')}`
}
