// Display formatting helpers shared across pages.

const CURRENCY = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const CURRENCY_WHOLE = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export function formatCurrency(amount, decimals = 2) {
  const value = Number(amount || 0)
  const formatter = decimals === 0 ? CURRENCY_WHOLE : CURRENCY
  return `Rs. ${formatter.format(value)}`
}

/** Abbreviated form for dashboard tiles: Rs. 1.2L, Rs. 45.0K. */
export function formatCompactCurrency(amount) {
  const value = Number(amount || 0)
  if (value >= 10000000) return `Rs. ${(value / 10000000).toFixed(1)}Cr`
  if (value >= 100000) return `Rs. ${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `Rs. ${(value / 1000).toFixed(1)}K`
  return `Rs. ${Math.round(value)}`
}

export function formatDate(isoString, withTime = false) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''

  const datePart = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  if (!withTime) return datePart

  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${datePart}, ${timePart}`
}

/** "3 days ago" style label, falling back to an absolute date past a month. */
export function formatRelative(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return formatDate(isoString)
}

export function titleCase(value) {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function truncate(text, length = 100) {
  if (!text) return ''
  return text.length > length ? `${text.slice(0, length).trimEnd()}...` : text
}

export function initials(name) {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase()
}

/** Rough password strength score (0-4) driving the meter on the auth forms. */
export function passwordStrength(password) {
  if (!password) return { score: 0, label: '' }
  let score = 0
  if (password.length >= 6) score += 1
  if (password.length >= 10) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1

  const labels = ['', 'weak', 'fair', 'good', 'strong']
  return { score, label: labels[score] }
}
