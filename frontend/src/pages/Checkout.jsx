import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useApi, usePageTitle } from '../hooks/useApi'
import { formatCurrency } from '../api/format'
import { onImageError } from '../components/ProductCard'
import Icon from '../components/Icon'
import { EmptyState, Skeleton } from '../components/ui'

const STEPS = [
  { key: 'cart', label: 'Cart' },
  { key: 'details', label: 'Delivery' },
  { key: 'done', label: 'Confirm' },
]

export default function Checkout() {
  usePageTitle('Checkout')
  const { refresh } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const { data, loading, error } = useApi('/api/checkout')
  const [form, setForm] = useState({ shipping_address: '', phone: '', notes: '' })
  const [saveDetails, setSaveDetails] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const cartItems = data?.cart_items || []
  const issues = data?.issues || []

  // Pre-fill delivery details from the saved profile once the cart loads.
  useEffect(() => {
    if (!data?.user) return
    setForm((current) => ({
      ...current,
      shipping_address: current.shipping_address || data.user.address || '',
      phone: current.phone || data.user.phone || '',
    }))
  }, [data])

  // An empty cart has nothing to check out - send them back to the shop.
  useEffect(() => {
    if (!loading && data && cartItems.length === 0) {
      showToast('Your cart is empty.', 'info')
      navigate('/products', { replace: true })
    }
  }, [loading, data, cartItems.length, navigate, showToast])

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = await api.post('/api/checkout', { ...form, save_details: saveDetails })
      showToast(result.message, 'success')
      refresh()
      navigate(`/order-confirmation/${result.order.id}`, { replace: true })
    } catch (err) {
      showToast(err.message, 'danger')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container page">
        <h2 className="section-title">Checkout</h2>
        <div className="checkout-grid">
          <Skeleton height={420} radius="var(--radius)" />
          <Skeleton height={300} radius="var(--radius)" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container page">
        <EmptyState
          icon="alertCircle"
          title="Couldn't load checkout"
          description="Please go back to your cart and try again."
          action={<Link to="/cart" className="btn btn-primary">Back to cart</Link>}
        />
      </div>
    )
  }

  if (cartItems.length === 0) return null

  return (
    <div className="container page">
      <h2 className="section-title">Checkout</h2>

      <div className="checkout-steps">
        {STEPS.map((step, index) => (
          <div key={step.key} style={{ display: 'contents' }}>
            {index > 0 && <span className="step-line" />}
            <div className={`checkout-step ${index === 0 ? 'done' : index === 1 ? 'active' : ''}`}>
              <span className="step-dot">
                {index === 0 ? <Icon name="check" size={13} /> : index + 1}
              </span>
              <span className="step-name">{step.label}</span>
            </div>
          </div>
        ))}
      </div>

      {issues.length > 0 && (
        <div className="banner-warning">
          <Icon name="alertTriangle" size={18} />
          <div>
            <strong>Please fix these before placing your order</strong>
            <ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
            <Link to="/cart" className="btn btn-subtle btn-sm" style={{ marginTop: 8 }}>
              Back to cart
            </Link>
          </div>
        </div>
      )}

      <div className="checkout-grid">
        <div className="card">
          <h3 style={{ marginBottom: 'var(--sp-4)' }}>Delivery Details</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="shipping_address">Shipping address *</label>
              <textarea
                id="shipping_address"
                className="form-control"
                required
                rows="3"
                placeholder="House / street, area, city, PIN code"
                value={form.shipping_address}
                onChange={setField('shipping_address')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone number *</label>
              <input
                id="phone"
                type="tel"
                className="form-control"
                required
                maxLength={15}
                placeholder="Contact number we can reach you on"
                value={form.phone}
                onChange={setField('phone')}
              />
              <span className="form-hint">We call this number to confirm measurements and collection.</span>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Order notes (optional)</label>
              <textarea
                id="notes"
                className="form-control"
                rows="3"
                placeholder="Any special instructions - preferred lining, delivery timing, and so on."
                value={form.notes}
                onChange={setField('notes')}
              />
            </div>

            <div className="form-check">
              <input
                type="checkbox"
                id="save_details"
                checked={saveDetails}
                onChange={(e) => setSaveDetails(e.target.checked)}
              />
              <label htmlFor="save_details">
                Save this address and phone number to my profile for next time
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-success btn-lg btn-block"
              disabled={submitting || issues.length > 0}
              style={{ marginTop: 'var(--sp-4)' }}
            >
              {submitting ? <span className="spinner" /> : <Icon name="checkCircle" size={18} />}
              Place order
            </button>

            <p className="text-xs text-muted text-center" style={{ marginTop: 'var(--sp-3)' }}>
              No online payment required. Pay when you receive or pick up your order.
            </p>
          </form>
        </div>

        <aside className="summary-card">
          <h3>Order Summary</h3>

          <div className="summary-line-items">
            {cartItems.map((item) => (
              <div className="summary-item" key={item.id}>
                <img
                  src={item.product?.images?.[0]?.url || '/default-product.svg'}
                  alt={item.product?.name || ''}
                  onError={onImageError}
                />
                <div>
                  <div className="si-name">{item.product?.name}</div>
                  <div className="si-qty">
                    Qty {item.quantity}
                    {item.measurements && Object.keys(item.measurements).length > 0 && ' · Custom fit'}
                  </div>
                </div>
                <span className="si-price">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatCurrency(data.subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Delivery</span>
            <span className="text-muted">Arranged on collection</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span className="price">{formatCurrency(data.total)}</span>
          </div>

          <Link to="/cart" className="btn btn-ghost btn-block" style={{ marginTop: 'var(--sp-3)' }}>
            <Icon name="chevronLeft" size={15} /> Edit cart
          </Link>
        </aside>
      </div>
    </div>
  )
}
