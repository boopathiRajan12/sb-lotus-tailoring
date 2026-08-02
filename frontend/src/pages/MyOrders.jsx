import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useApi, usePageTitle } from '../hooks/useApi'
import { formatCurrency, formatDate } from '../api/format'
import { onImageError } from '../components/ProductCard'
import { OrderTrack } from '../components/OrderTimeline'
import Icon from '../components/Icon'
import { ConfirmDialog, EmptyState, Skeleton, StatusBadge } from '../components/ui'

const FILTERS = [
  { value: 'all', label: 'All orders' },
  { value: 'active', label: 'In progress' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function MyOrders() {
  usePageTitle('My Orders')
  const { refresh } = useAuth()
  const { showToast } = useToast()
  const { data, loading, error, reload } = useApi('/api/orders')

  const [filter, setFilter] = useState('all')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const orders = useMemo(() => {
    const all = data?.orders || []
    if (filter === 'active') return all.filter((o) => !['delivered', 'cancelled'].includes(o.status))
    if (filter === 'delivered') return all.filter((o) => o.status === 'delivered')
    if (filter === 'cancelled') return all.filter((o) => o.status === 'cancelled')
    return all
  }, [data, filter])

  const handleCancel = async () => {
    setBusy(true)
    try {
      const result = await api.post(`/api/orders/${cancelTarget.id}/cancel`, {})
      showToast(result.message, 'info')
      setCancelTarget(null)
      reload()
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setBusy(false)
    }
  }

  const handleReorder = async (orderId) => {
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
        <h2 className="section-title">My Orders</h2>
        <div className="stack">
          {[0, 1, 2].map((i) => <Skeleton key={i} height={210} radius="var(--radius)" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container page">
        <EmptyState
          icon="alertCircle"
          title="Couldn't load your orders"
          description="Please refresh the page and try again."
        />
      </div>
    )
  }

  const allOrders = data?.orders || []

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h2>My Orders</h2>
          <p>Track every order from placed to delivered.</p>
        </div>
      </div>

      {allOrders.length > 0 && (
        <div className="chip-row" style={{ marginBottom: 'var(--sp-5)' }}>
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`chip ${filter === option.value ? 'active' : ''}`}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {orders.length > 0 ? (
        <div className="stack fade-in">
          {orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-card-head">
                <div>
                  <div className="order-id">Order #{order.id}</div>
                  <div className="order-date">Placed {formatDate(order.created_at, true)}</div>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div className="order-card-body">
                <div className="order-items-strip">
                  {order.items.slice(0, 5).map((item) => (
                    item.product_image ? (
                      <img
                        key={item.id}
                        src={item.product_image}
                        alt={item.product_name || ''}
                        onError={onImageError}
                        title={`${item.product_name} x${item.quantity}`}
                      />
                    ) : (
                      <span className="more-count" key={item.id} title={item.product_name}>
                        <Icon name="package" size={16} />
                      </span>
                    )
                  ))}
                  {order.items.length > 5 && (
                    <span className="more-count">+{order.items.length - 5}</span>
                  )}
                </div>

                <p className="text-sm text-light">
                  {order.items.map((item) => `${item.product_name} (x${item.quantity})`).join(', ')}
                </p>

                <OrderTrack status={order.status} />
              </div>

              <div className="order-card-foot">
                <div>
                  <span className="text-xs text-muted">Total</span>{' '}
                  <strong className="price">{formatCurrency(order.total_amount)}</strong>
                </div>

                <div className="row" style={{ gap: 8 }}>
                  <Link to={`/my-orders/${order.id}`} className="btn btn-outline btn-sm">
                    View details
                  </Link>
                  <button
                    type="button"
                    className="btn btn-subtle btn-sm"
                    onClick={() => handleReorder(order.id)}
                  >
                    <Icon name="refresh" size={14} /> Reorder
                  </button>
                  {order.can_cancel && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => setCancelTarget(order)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="package"
          title={allOrders.length ? 'No orders in this view' : 'No orders yet'}
          description={
            allOrders.length
              ? 'Try a different filter to see your other orders.'
              : 'When you place an order it will show up here with live tracking.'
          }
          action={
            !allOrders.length && <Link to="/products" className="btn btn-primary">Browse products</Link>
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title={`Cancel order #${cancelTarget?.id}?`}
        message="We will stop work on this order and release any reserved stock. This cannot be undone from here - call the shop if you change your mind."
        confirmLabel="Yes, cancel order"
        cancelLabel="Keep order"
        busy={busy}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  )
}
