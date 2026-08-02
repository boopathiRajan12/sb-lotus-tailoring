import Icon from './Icon'
import { formatDate } from '../api/format'

// The happy-path lifecycle, mirroring ORDER_FLOW on the server.
export const ORDER_FLOW = ['pending', 'confirmed', 'stitching', 'ready', 'delivered']

export const STATUS_META = {
  pending:   { label: 'Order placed',  icon: 'clock',       hint: 'We have received your order.' },
  confirmed: { label: 'Confirmed',     icon: 'checkCircle', hint: 'Details confirmed with you.' },
  stitching: { label: 'Stitching',     icon: 'scissors',    hint: 'Your garment is being made.' },
  ready:     { label: 'Ready',         icon: 'package',     hint: 'Ready for pickup or delivery.' },
  delivered: { label: 'Delivered',     icon: 'truck',       hint: 'Handed over. Thank you!' },
  cancelled: { label: 'Cancelled',     icon: 'xCircle',     hint: 'This order was cancelled.' },
}

/**
 * Vertical timeline: the recorded history plus the steps still to come, so a
 * customer can see where their order sits in the process.
 */
export default function OrderTimeline({ status, history = [] }) {
  const cancelled = status === 'cancelled'
  const historyByStatus = new Map(history.map((h) => [h.status, h]))
  const currentIndex = ORDER_FLOW.indexOf(status)

  const steps = cancelled
    ? [...history].map((entry) => ({
        status: entry.status,
        entry,
        state: entry.status === 'cancelled' ? 'cancelled' : 'done',
      }))
    : ORDER_FLOW.map((step, index) => ({
        status: step,
        entry: historyByStatus.get(step),
        state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pendingStep',
      }))

  return (
    <div className="timeline">
      {steps.map(({ status: step, entry, state }, index) => {
        const meta = STATUS_META[step] || { label: step, icon: 'info' }
        return (
          <div className={`timeline-item ${state}`} key={`${step}-${index}`}>
            <span className="timeline-dot">
              {state === 'done' && <Icon name="check" size={10} />}
              {state === 'current' && <Icon name={meta.icon} size={10} />}
              {state === 'cancelled' && <Icon name="x" size={10} />}
            </span>
            <strong>{meta.label}</strong>
            {entry?.created_at ? (
              <span>{formatDate(entry.created_at, true)}</span>
            ) : (
              <span>{state === 'pendingStep' ? 'Upcoming' : ''}</span>
            )}
            {entry?.note && <p>{entry.note}</p>}
          </div>
        )
      })}
    </div>
  )
}

/** Compact horizontal progress bar for order cards in a list. */
export function OrderTrack({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="row" style={{ gap: 8, color: 'var(--danger)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
        <Icon name="xCircle" size={14} /> This order was cancelled
      </div>
    )
  }

  const currentIndex = ORDER_FLOW.indexOf(status)

  return (
    <div className="track-bar">
      {ORDER_FLOW.map((step, index) => {
        const meta = STATUS_META[step]
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : ''
        return (
          <div key={step} style={{ display: 'contents' }}>
            {index > 0 && <div className={`track-fill ${index <= currentIndex ? 'done' : ''}`} />}
            <div className={`track-node ${state}`}>
              <span className="node-dot">
                {index < currentIndex
                  ? <Icon name="check" size={11} />
                  : <Icon name={meta.icon} size={11} />}
              </span>
              <span>{meta.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
