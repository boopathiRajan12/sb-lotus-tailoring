import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatCurrency } from '../api/format'

export default function Checkout() {
  const { user, refresh } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [cartItems, setCartItems] = useState(null)
  const [total, setTotal] = useState(0)
  const [shippingAddress, setShippingAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/api/checkout').then((data) => {
      if (data.cart_items.length === 0) {
        showToast('Your cart is empty.', 'info')
        navigate('/products')
        return
      }
      setCartItems(data.cart_items)
      setTotal(data.total)
    })
    setShippingAddress(user?.address || '')
    setPhone(user?.phone || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const data = await api.post('/api/checkout', { shipping_address: shippingAddress, phone, notes })
      showToast(data.message, 'success')
      refresh()
      navigate(`/order-confirmation/${data.order.id}`)
    } catch (err) {
      showToast(err.message, 'danger')
      setSubmitting(false)
    }
  }

  if (!cartItems) return null

  return (
    <div className="container" style={{ padding: '30px 0' }}>
      <h2 className="section-title">Checkout</h2>

      <div className="checkout-grid">
        <div>
          <form onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: 20, color: 'var(--primary)' }}>Delivery Details</h3>

            <div className="form-group">
              <label htmlFor="shipping_address">Shipping Address *</label>
              <textarea
                id="shipping_address" className="form-control" required rows="3"
                placeholder="Full delivery address"
                value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                type="text" id="phone" className="form-control" required
                placeholder="Contact number"
                value={phone} onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="notes">Order Notes (optional)</label>
              <textarea
                id="notes" className="form-control" rows="3"
                placeholder="Any special instructions..."
                value={notes} onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-success btn-lg" style={{ width: '100%' }} disabled={submitting}>Place Order</button>
            <p style={{ textAlign: 'center', marginTop: 10, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No online payment required. Pay when you receive or pick up your order.
            </p>
          </form>
        </div>

        <div className="checkout-summary">
          <h3 style={{ marginBottom: 20, color: 'var(--primary)' }}>Order Summary</h3>
          {cartItems.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <strong>{item.product.name}</strong><br />
                <small style={{ color: 'var(--text-muted)' }}>Qty: {item.quantity}</small>
              </div>
              <div style={{ textAlign: 'right' }}>{formatCurrency(item.subtotal)}</div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
