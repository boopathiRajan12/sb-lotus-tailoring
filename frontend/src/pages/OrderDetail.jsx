import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useApi, usePageTitle } from '../hooks/useApi'
import { formatCurrency, formatDate } from '../api/format'
import { onImageError } from '../components/ProductCard'
import OrderTimeline from '../components/OrderTimeline'
import { MEASUREMENT_FIELDS } from '../api/measurements'
import Icon from '../components/Icon'
import { ConfirmDialog, EmptyState, Skeleton, StatusBadge } from '../components/ui'

export default function OrderDetail() {
  const { orderId } = useParams()
  usePageTitle(`Order #${orderId}`)
  const { refresh } = useAuth()
  const { showToast } = useToast()
  const { data, loading, error, reload } = useApi(`/api/orders/${orderId}`)

  const [confirmCancel, setConfirmCancel] = useState(false)
  const [busy, setBusy] = useState(false)

  const order = data?.order

  const handleCancel = async () => {
    setBusy(true)
    try {
      const result = await api.post(`/api/orders/${orderId}/cancel`, {})
      showToast(result.message, 'info')
      setConfirmCancel(false)
      reload()
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setBusy(false)
    }
  }

  const handleReorder = async () => {
    try {
      const result = await api.post(`/api/orders/${orderId}/reorder`)
      showToast(result.message, 'success')
      refresh()
    } catch (err) {
      showToast(err.message, 'danger')
    }
  }

  if (loading) {
    return (
      <div className="container page">
        <Skeleton height={40} width={220} style={{ marginBottom: 24 }} />
        <Skeleton height={380} radius="var(--radius)" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container page">
        <EmptyState
          icon="alertCircle"
          title="Order not found"
          description="We couldn't find that order on your account."
          action={<Link to="/my-orders" className="btn btn-primary">Back to my orders</Link>}
        />
      </div>
    )
  }

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <div className="row" style={{ gap: 12 }}>
            <h2>Order #{order.id}</h2>
            <StatusBadge status={order.status} />
          </div>
          <p>Placed {formatDate(order.created_at, true)}</p>
        </div>

        <div className="row no-print" style={{ gap: 8 }}>
          <Link to="/my-orders" className="btn btn-ghost btn-sm">
            <Icon name="chevronLeft" size={15} /> All orders
          </Link>
          <button type="button" className="btn btn-subtle btn-sm" onClick={() => window.print()}>
            <Icon name="printer" size={15} /> Print
          </button>
          <button type="button" className="btn btn-subtle btn-sm" onClick={handleReorder}>
            <Icon name="refresh" size={15} /> Reorder
          </button>
          {order.can_cancel && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--danger)' }}
              onClick={() => setConfirmCancel(true)}
            >
              Cancel order
            </button>
          )}
        </div>
      </div>

      <div className="checkout-grid">
        <div className="stack">
          <div className="card">
            <h3 style={{ marginBottom: 'var(--sp-4)' }}>Items</h3>
            <div className="stack" style={{ gap: 'var(--sp-4)' }}>
              {order.items.map((item) => (
                <div className="summary-item" key={item.id} style={{ alignItems: 'flex-start' }}>
                  {item.product_image ? (
                    <img src={item.product_image} alt={item.product_name || ''} onError={onImageError} />
                  ) : (
                    <span className="more-count" style={{ width: 44, height: 52 }}>
                      <Icon name="package" size={16} />
                    </span>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="si-name">
                      {item.product_id ? (
                        <Link to={`/products/${item.product_id}`}>{item.product_name}</Link>
                      ) : item.product_name}
                    </div>
                    <div className="si-qty">
                      {item.quantity} x {formatCurrency(item.price)}
                    </div>

                    {item.measurements && Object.keys(item.measurements).length > 0 && (
                      <div className="measurement-chips" style={{ marginTop: 8 }}>
                        {MEASUREMENT_FIELDS
                          .filter(({ key }) => item.measurements[key])
                          .map(({ key, label }) => (
                            <span className="measurement-chip" key={key}>
                              <span className="m-label">{label}</span>
                              <span className="m-value">{item.measurements[key]}"</span>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  <span className="si-price">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="summary-row total">
              <span>Total</span>
              <span className="price">{formatCurrency(order.total_amount)}</span>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 'var(--sp-4)' }}>Delivery details</h3>
            <div className="profile-info-grid">
              <div className="profile-info-item">
                <span className="profile-label">Phone</span>
                <span className="profile-value">{order.phone || 'Not provided'}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-label">Address</span>
                <span className="profile-value">{order.shipping_address || 'Not provided'}</span>
              </div>
              {order.notes && (
                <div className="profile-info-item">
                  <span className="profile-label">Your notes</span>
                  <span className="profile-value">{order.notes}</span>
                </div>
              )}
              {order.cancel_reason && (
                <div className="profile-info-item">
                  <span className="profile-label">Cancellation reason</span>
                  <span className="profile-value">{order.cancel_reason}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="summary-card">
          <h3>Order progress</h3>
          <OrderTimeline status={order.status} history={order.history} />
        </aside>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title={`Cancel order #${order.id}?`}
        message="We will stop work on this order and release any reserved stock. Call the shop if you change your mind afterwards."
        confirmLabel="Yes, cancel order"
        cancelLabel="Keep order"
        busy={busy}
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  )
}
