import { Link, useParams } from 'react-router-dom'
import { useApi, usePageTitle } from '../hooks/useApi'
import { formatCurrency, formatDate } from '../api/format'
import Icon from '../components/Icon'
import { EmptyState, Skeleton, StatusBadge } from '../components/ui'

export default function OrderConfirmation() {
  const { orderId } = useParams()
  usePageTitle('Order confirmed')
  const { data, loading, error } = useApi(`/api/orders/${orderId}`)

  const order = data?.order

  if (loading) {
    return (
      <div className="container page">
        <Skeleton height={480} radius="var(--radius-lg)" style={{ maxWidth: 620, margin: '0 auto' }} />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container page">
        <EmptyState
          icon="alertCircle"
          title="Order not found"
          description="We couldn't find that order. Check your order history."
          action={<Link to="/my-orders" className="btn btn-primary">View my orders</Link>}
        />
      </div>
    )
  }

  return (
    <div className="container page">
      <div className="card fade-in" style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center' }}>
        <div
          className="feature-icon"
          style={{
            margin: '0 auto var(--sp-4)',
            width: 62,
            height: 62,
            background: 'var(--success-soft)',
            color: 'var(--success)',
          }}
        >
          <Icon name="checkCircle" size={30} />
        </div>

        <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--sp-2)' }}>
          Order placed successfully
        </h2>
        <p className="text-light" style={{ marginBottom: 'var(--sp-5)' }}>
          Thank you! Your order <strong>#{order.id}</strong> has been received. We will
          call you shortly to confirm the details.
        </p>

        <div className="profile-info-grid" style={{ textAlign: 'left' }}>
          <div className="profile-info-item">
            <span className="profile-label">Order number</span>
            <span className="profile-value">#{order.id}</span>
          </div>
          <div className="profile-info-item">
            <span className="profile-label">Placed on</span>
            <span className="profile-value">{formatDate(order.created_at, true)}</span>
          </div>
          <div className="profile-info-item">
            <span className="profile-label">Status</span>
            <span className="profile-value"><StatusBadge status={order.status} /></span>
          </div>
          <div className="profile-info-item">
            <span className="profile-label">Total</span>
            <span className="profile-value price">{formatCurrency(order.total_amount)}</span>
          </div>
          <div className="profile-info-item">
            <span className="profile-label">Phone</span>
            <span className="profile-value">{order.phone}</span>
          </div>
          <div className="profile-info-item">
            <span className="profile-label">Delivery address</span>
            <span className="profile-value">{order.shipping_address}</span>
          </div>
        </div>

        <div className="divider" />

        <h3 style={{ marginBottom: 'var(--sp-3)', fontSize: 'var(--text-base)' }}>Your items</h3>
        {order.items.map((item) => (
          <div className="summary-row" key={item.id} style={{ textAlign: 'left' }}>
            <span>{item.product_name} x {item.quantity}</span>
            <span>{formatCurrency(item.subtotal)}</span>
          </div>
        ))}

        <div className="callout" style={{ textAlign: 'left', marginTop: 'var(--sp-5)' }}>
          <Icon name="info" size={20} />
          <div>
            <strong>What happens next</strong>
            We confirm your order by phone, start stitching, and let you know the moment
            it's ready. No payment is needed until you collect it.
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'center', marginTop: 'var(--sp-5)' }}>
          <Link to={`/my-orders/${order.id}`} className="btn btn-primary">Track this order</Link>
          <Link to="/products" className="btn btn-outline">Continue shopping</Link>
        </div>
      </div>
    </div>
  )
}
