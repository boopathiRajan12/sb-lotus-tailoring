import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { formatCurrency } from '../api/format'

export default function OrderConfirmation() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)

  useEffect(() => {
    api.get(`/api/orders/${orderId}`).then((data) => setOrder(data.order))
  }, [orderId])

  if (!order) return null

  return (
    <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
      <div style={{ background: 'var(--bg-white)', maxWidth: 600, margin: '0 auto', padding: 40, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <div style={{ fontSize: '3rem', color: 'var(--success)', marginBottom: 15 }}>&#10003;</div>
        <h2 style={{ color: 'var(--primary)', marginBottom: 10 }}>Order Placed Successfully!</h2>
        <p style={{ color: 'var(--text-light)', marginBottom: 25 }}>
          Your order <strong>#{order.id}</strong> has been placed. We will contact you soon to confirm.
        </p>

        <div style={{ textAlign: 'left', background: 'var(--accent)', padding: 20, borderRadius: 'var(--radius)', marginBottom: 25 }}>
          <p><strong>Order ID:</strong> #{order.id}</p>
          <p><strong>Total:</strong> {formatCurrency(order.total_amount)}</p>
          <p><strong>Status:</strong> <span className="badge badge-pending">{order.status}</span></p>
          <p><strong>Delivery Address:</strong> {order.shipping_address}</p>
          <p><strong>Phone:</strong> {order.phone}</p>
        </div>

        <h3 style={{ marginBottom: 15 }}>Order Items</h3>
        {order.items.map((item) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span>{item.product_name} x {item.quantity}</span>
            <span>{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}

        <div style={{ marginTop: 25 }}>
          <Link to="/my-orders" className="btn btn-outline">View All Orders</Link>{' '}
          <Link to="/products" className="btn btn-primary">Continue Shopping</Link>
        </div>
      </div>
    </div>
  )
}
