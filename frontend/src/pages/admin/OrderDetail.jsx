import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { formatCurrency, formatDate } from '../../api/format'

const MEASUREMENT_LABELS = {
  bust: 'Bust', waist: 'Waist', shoulder: 'Shoulder',
  sleeve: 'Sleeve Length', blength: 'Blouse Length', armhole: 'Arm Hole',
}

export default function OrderDetail() {
  const { orderId } = useParams()
  const { showToast } = useToast()
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    api.get(`/api/admin/orders/${orderId}`).then((data) => {
      setOrder(data.order)
      setStatus(data.order.status)
    })
  }

  useEffect(load, [orderId])

  const handleUpdateStatus = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const data = await api.put(`/api/admin/orders/${orderId}/status`, { status })
      showToast(data.message, 'success')
      setOrder(data.order)
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  if (!order) return null

  return (
    <>
      <div className="page-header">
        <h2>Order #{order.id}</h2>
        <Link to="/admin/orders" className="btn btn-outline btn-sm">Back to Orders</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 25 }}>
        <div style={{ background: 'var(--bg-white)', padding: 25, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ marginBottom: 15, color: 'var(--primary)' }}>Order Details</h3>
          <p><strong>Customer:</strong> {order.user.username} ({order.user.email})</p>
          <p><strong>Phone:</strong> {order.phone || '-'}</p>
          <p><strong>Address:</strong> {order.shipping_address || '-'}</p>
          <p><strong>Notes:</strong> {order.notes || 'None'}</p>
          <p><strong>Date:</strong> {formatDate(order.created_at, true)}</p>
          <p><strong>Total:</strong> <span style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 700 }}>{formatCurrency(order.total_amount)}</span></p>
        </div>

        <div style={{ background: 'var(--bg-white)', padding: 25, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ marginBottom: 15, color: 'var(--primary)' }}>Update Status</h3>
          <p>Current: <span className={`badge badge-${order.status}`}>{order.status[0].toUpperCase() + order.status.slice(1)}</span></p>
          <form onSubmit={handleUpdateStatus} style={{ marginTop: 15 }}>
            <div className="form-group">
              <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="stitching">Stitching</option>
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>Update Status</button>
          </form>
        </div>
      </div>

      <div style={{ marginTop: 25 }}>
        <h3 style={{ marginBottom: 15 }}>Order Items</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Subtotal</th>
              <th>Measurements</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.product_name}
                  {item.measurements && <span className="badge badge-custom">Custom</span>}
                </td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.price)}</td>
                <td>{formatCurrency(item.price * item.quantity)}</td>
                <td>
                  {item.measurements ? (
                    <table className="measurement-detail-table">
                      <tbody>
                        {Object.entries(item.measurements).map(([key, value]) => (
                          <tr key={key}>
                            <td className="measurement-label">{MEASUREMENT_LABELS[key] || key}</td>
                            <td className="measurement-value">{value} inches</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Standard (No measurements)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
