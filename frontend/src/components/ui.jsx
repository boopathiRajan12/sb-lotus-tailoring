// Small presentational primitives shared across pages: loading skeletons,
// empty states, modals, star ratings, quantity steppers, and status badges.
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'

/* ── Skeletons ─────────────────────────────────────────────── */

export function Skeleton({ width, height, radius, style }) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />
}

export function SkeletonText({ lines = 3, width = '100%' }) {
  return (
    <>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton-text"
          style={{ width: i === lines - 1 ? '65%' : width }}
        />
      ))}
    </>
  )
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="product-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton skeleton-media" />
          <div className="skeleton-lines">
            <div className="skeleton skeleton-text" style={{ width: '40%' }} />
            <div className="skeleton skeleton-title" style={{ width: '85%' }} />
            <div className="skeleton skeleton-text" style={{ width: '30%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((__, c) => (
                <td key={c}><div className="skeleton skeleton-text" style={{ marginBottom: 0 }} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CardsSkeleton({ count = 4, height = 110 }) {
  return (
    <div className="stat-cards">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton" key={i} style={{ height, borderRadius: 'var(--radius)' }} />
      ))}
    </div>
  )
}

/* ── Empty state ───────────────────────────────────────────── */

export function EmptyState({ icon = 'package', title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon name={icon} size={28} /></div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}

/* ── Modal + confirm dialog ────────────────────────────────── */

export function Modal({ open, onClose, title, children, footer, size = '' }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    // Stop the page behind the dialog from scrolling.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className={`modal ${size === 'lg' ? 'modal-lg' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close dialog">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  tone = 'danger', busy = false, onConfirm, onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button type="button" className="btn btn-subtle" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <span className="spinner" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className={`modal-icon ${tone}`}>
        <Icon name={tone === 'danger' ? 'alertTriangle' : 'alertCircle'} size={22} />
      </div>
      {message}
    </Modal>
  )
}

/* ── Star rating ───────────────────────────────────────────── */

export function Stars({ value = 0, size = 14, showValue = false, count }) {
  const rounded = Math.round(value)
  return (
    <span className="rating-line">
      <span className={`stars ${size >= 20 ? 'stars-lg' : ''}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name="star"
            size={size}
            fill={star <= rounded ? 'currentColor' : 'none'}
            className={star <= rounded ? '' : 'star-empty'}
          />
        ))}
      </span>
      {showValue && value > 0 && <strong>{Number(value).toFixed(1)}</strong>}
      {count !== undefined && <span>({count})</span>}
    </span>
  )
}

export function RatingInput({ value, onChange, disabled = false }) {
  return (
    <div className="rating-input" role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={star <= value ? 'on' : ''}
          onClick={() => onChange(star)}
          disabled={disabled}
          role="radio"
          aria-checked={star === value}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <Icon name="star" size={28} fill={star <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

/* ── Quantity stepper ──────────────────────────────────────── */

export function QuantityStepper({ value, onChange, min = 1, max = 20, disabled = false }) {
  const clamp = (next) => Math.max(min, Math.min(max, next))

  return (
    <div className="qty-stepper">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        <Icon name="minus" size={14} />
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        aria-label="Quantity"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        <Icon name="plus" size={14} />
      </button>
    </div>
  )
}

/* ── Status badge ──────────────────────────────────────────── */

const STATUS_ICON = {
  pending: 'clock',
  confirmed: 'checkCircle',
  stitching: 'scissors',
  ready: 'package',
  delivered: 'truck',
  cancelled: 'xCircle',
}

export function StatusBadge({ status }) {
  if (!status) return null
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className={`badge badge-${status}`}>
      <Icon name={STATUS_ICON[status] || 'info'} size={12} />
      {label}
    </span>
  )
}

/* ── Section header with optional "view all" link ──────────── */

export function SectionHead({ title, subtitle, action, to }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {to ? (
        <Link to={to} className="btn btn-ghost btn-sm">
          {action || 'View all'} <Icon name="arrowRight" size={15} />
        </Link>
      ) : action}
    </div>
  )
}
