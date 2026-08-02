import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { useApi, usePageTitle } from '../../hooks/useApi'
import { formatCurrency, formatDate } from '../../api/format'
import OrderTimeline from '../../components/OrderTimeline'
import { MEASUREMENT_FIELDS } from '../../api/measurements'
import Icon from '../../components/Icon'
import { EmptyState, Skeleton, StatusBadge } from '../../components/ui'

const STATUSES = ['pending', 'confirmed', 'stitching', 'ready', 'delivered', 'cancelled']

export default function OrderDetail() {
  const { orderId } = useParams()
  usePageTitle(`Order #${orderId}`)
  const { showToast } = useToast()
  const { data, loading, error, reload } = useApi(`/api/admin/orders/${orderId}`)

  const [status, setStatus] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const order = data?.order

  useEffect(() => {
    if (order) setStatus(order.status)
  }, [order])

  const handleUpdateStatus = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = await api.put(`/api/admin/orders/${orderId}/status`, { status, note })
      showToast(result.message, 'success')
      setNote('')
      reload()
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <Skeleton height={36} width={220} style={{ marginBottom: 24 }} />
        <Skeleton height={420} radius="var(--radius)" />
      </>
    )
  }

  if (error || !order) {
    return (
      <EmptyState
        icon="alertCircle"
        title="Order not found"
        description="That order doesn't exist or has been deleted."
        action={<Link to="/admin/orders" className="btn btn-primary">Back to orders</Link>}
      />
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="row" style={{ gap: 12 }}>
            <h2>Order #{order.id}</h2>
            <StatusBadge status={order.status} />
          </div>
          <p>Placed {formatDate(order.created_at, true)}</p>
        </div>

        <div className="row no-print" style={{ gap: 8 }}>
          <Link to="/admin/orders" className="btn btn-ghost btn-sm">
            <Icon name="chevronLeft" size={15} /> All orders
          </Link>
          <button type="button" className="btn btn-subtle btn-sm" onClick={() => window.print()}>
            <Icon name="printer" size={15} /> Print job sheet
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3 style={{ marginBottom: 'var(--sp-4)' }}>Customer &amp; delivery</h3>

          <div className="profile-info-grid">
            <div className="profile-info-item">
              <span className="profile-label">Customer</span>
              <span className="profile-value">
                {order.user ? (
                  <Link to={`/admin/users/${order.user.id}`}>{order.user.username}</Link>
                ) : 'Unknown'}
              </span>
            </div>
            <div className="profile-info-item">
              <span className="profile-label">Email</span>
              <span className="profile-value">{order.user?.email || '-'}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-label">Phone</span>
              <span className="profile-value">{order.phone || '-'}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-label">Order total</span>
              <span className="profile-value price">{formatCurrency(order.total_amount)}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-label">Delivery address</span>
              <span className="profile-value">{order.shipping_address || '-'}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-label">Customer notes</span>
              <span className="profile-value">{order.notes || 'None'}</span>
            </div>
            {order.cancel_reason && (
              <div className="profile-info-item">
                <span className="profile-label">Cancellation reason</span>
                <span className="profile-value">{order.cancel_reason}</span>
              </div>
            )}
          </div>
        </div>

        <div className="card no-print">
          <h3 style={{ marginBottom: 'var(--sp-4)' }}>Update status</h3>

          <form onSubmit={handleUpdateStatus}>
            <div className="form-group">
              <label htmlFor="status">New status</label>
              <select
                id="status"
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
              <span className="form-hint">
                Cancelling returns any reserved stock to inventory.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="note">Note for the timeline (optional)</label>
              <input
                id="note"
                type="text"
                className="form-control"
                placeholder="e.g. Fabric received, stitching starts Monday"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || status === order.status}
            >
              {submitting ? <span className="spinner" /> : <Icon name="check" size={16} />}
              Update status
            </button>
          </form>

          <div className="divider" />

          <h3 style={{ marginBottom: 'var(--sp-3)' }}>Timeline</h3>
          <OrderTimeline status={order.status} history={order.history} />
        </div>
      </div>

      <div style={{ marginTop: 'var(--sp-5)' }}>
        <h3 style={{ marginBottom: 'var(--sp-3)' }}>Items to stitch</h3>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="num">Qty</th>
                <th className="num">Unit price</th>
                <th className="num">Subtotal</th>
                <th>Measurements</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.product_id ? (
                      <Link to={`/admin/products/edit/${item.product_id}`}>{item.product_name}</Link>
                    ) : item.product_name}
                    {item.measurements && <span className="badge badge-custom" style={{ marginLeft: 6 }}>Custom</span>}
                  </td>
                  <td className="num">{item.quantity}</td>
                  <td className="num">{formatCurrency(item.price)}</td>
                  <td className="num">{formatCurrency(item.subtotal)}</td>
                  <td>
                    {item.measurements && Object.keys(item.measurements).length > 0 ? (
                      <table className="measurement-detail-table">
                        <tbody>
                          {MEASUREMENT_FIELDS
                            .filter(({ key }) => item.measurements[key])
                            .map(({ key, label }) => (
                              <tr key={key}>
                                <td className="measurement-label">{label}</td>
                                <td className="measurement-value">{item.measurements[key]}"</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    ) : (
                      <span className="text-muted text-xs">Standard (no measurements)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
