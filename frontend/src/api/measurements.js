// The measurement fields a custom-blouse order collects. Kept in one place
// because the product page, cart, profile, and admin screens all render them
// and the key order must match `MEASUREMENT_KEYS` on the server.

export const MEASUREMENT_FIELDS = [
  { key: 'bust', label: 'Bust', required: true },
  { key: 'waist', label: 'Waist', required: true },
  { key: 'shoulder', label: 'Shoulder', required: true },
  { key: 'sleeve', label: 'Sleeve Length' },
  { key: 'blength', label: 'Blouse Length' },
  { key: 'armhole', label: 'Arm Hole' },
]

/** Only the fields that actually carry a value, for compact display. */
export function filledMeasurements(measurements) {
  if (!measurements) return []
  return MEASUREMENT_FIELDS
    .filter(({ key }) => measurements[key])
    .map((field) => ({ ...field, value: measurements[key] }))
}
