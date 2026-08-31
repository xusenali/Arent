const MS_PER_DAY = 1000 * 60 * 60 * 24

export function daysBetween(fromDate, toDate) {
  const from = new Date(fromDate)
  const to = new Date(toDate)
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY)
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
