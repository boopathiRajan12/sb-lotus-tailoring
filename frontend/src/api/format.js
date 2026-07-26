// Mirrors the Jinja formatting the site used to do server-side:
// "Rs. {{ '%.2f'|format(price) }}" and "{{ date.strftime('%d %b %Y') }}"

export function formatCurrency(amount, decimals = 2) {
  const value = Number(amount || 0)
  return `Rs. ${value.toFixed(decimals)}`
}

export function formatDate(isoString, withTime = false) {
  if (!isoString) return ''
  const date = new Date(isoString)
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
