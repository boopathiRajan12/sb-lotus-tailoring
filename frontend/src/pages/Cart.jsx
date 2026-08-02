import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useApi, usePageTitle } from '../hooks/useApi'
import { formatCurrency } from '../api/format'
import { onImageError } from '../components/ProductCard'
import { MEASUREMENT_FIELDS } from '../api/measurements'
import Icon from '../components/Icon'
import { ConfirmDialog, EmptyState, QuantityStepper, Skeleton } from '../components/ui'

export default function Cart() {
  usePageTitle('Cart')
  const { refresh } = useAuth()
  const { showToast } = useToast()
  const { data, loading, error, reload } = useApi('/api/cart')

  const [busyId, setBusyId] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)

  const cartItems = data?.cart_items || []
  const issues = data?.issues || []

  const afterChange = () => { reload(); refresh() }

  const handleQuantity = async (itemId, quantity) => {
    setBusyId(itemId)
    try {
      await api.put(`/api/cart/items/${itemId}`, { quantity })
      afterChange()
    } catch (err) {
      showToast(err.message, 'danger')
      reload()
    } finally {
      setBusyId(null)
    }
  }

  const handleRemove = async (itemId) => {
    setBusyId(itemId)
    try {
      const result = await api.del(`/api/cart/items/${itemId}`)
      showToast(result.message, 'info')
      afterChange()
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setBusyId(null)
    }
  }

  const handleClear = async () => {
    setClearing(true)
    try {
      const result = await api.del('/api/cart')
      showToast(result.message, 'info')
      afterChange()
      setConfirmClear(false)
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setClearing(false)
    }
  }

  if (loading) {
    return (
      <div className="container page">
        <h2 className="section-title">Your Cart</h2>
        <div className="cart-layout">
          <div className="cart-lines">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={142} radius="var(--radius)" />
            ))}
          </div>
          <Skeleton height={260} radius="var(--radius)" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container page">
        <EmptyState
          icon="alertCircle"
          title="Couldn't load your cart"
          description="Please refresh the page and try again."
        />
      </div>
    )
  }

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h2>Your Cart</h2>
          <p>{data.item_count} item{data.item_count === 1 ? '' : 's'} ready for checkout</p>
        </div>
        {cartItems.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(true)}>
            <Icon name="trash" size={15} /> Clear cart
          </button>
        )}
      </div>

      {issues.length > 0 && (
        <div className="banner-warning">
          <Icon name="alertTriangle" size={18} />
          <div>
            <strong>Some items need your attention before checkout</strong>
            <ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
          </div>
        </div>
      )}

      {cartItems.length > 0 ? (
        <div className="cart-layout">
          <div className="cart-lines">
            {cartItems.map((item) => {
              const busy = busyId === item.id
              const maxQty = item.product?.is_made_to_order ? 20 : Math.max(1, item.product?.stock || 1)

              return (
                <div
                  className={`cart-line ${!item.available ? 'unavailable' : ''}`}
                  key={item.id}
                >
                  <Link to={`/products/${item.product_id}`}>
                    <img
                      className="cart-line-img"
                      src={item.product?.images?.[0]?.url || '/default-product.svg'}
                      alt={item.product?.name || 'Product'}
                      onError={onImageError}
                    />
                  </Link>

                  <div className="cart-line-info">
                    <h3>
                      <Link to={`/products/${item.product_id}`}>{item.product?.name}</Link>
                    </h3>
                    <span className="text-sm text-muted">
                      {formatCurrency(item.product?.price)} each
                    </span>

                    {item.measurements && Object.keys(item.measurements).length > 0 && (
                      <div className="measurement-chips">
                        {MEASUREMENT_FIELDS.filter(({ key }) => item.measurements[key]).map(({ key, label }) => (
                          <span className="measurement-chip" key={key}>
                            <span className="m-label">{label}</span>
                            <span className="m-value">{item.measurements[key]}"</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {!item.available && (
                      <span className="badge badge-cancelled" style={{ alignSelf: 'flex-start' }}>
                        <Icon name="slash" size={12} /> No longer available
                      </span>
                    )}
                    {item.stock_shortfall > 0 && (
                      <span className="badge badge-pending" style={{ alignSelf: 'flex-start' }}>
                        <Icon name="alertTriangle" size={12} /> Only {item.product.stock} left
                      </span>
                    )}
                  </div>

                  <div className="cart-line-side">
                    <QuantityStepper
                      value={item.quantity}
                      onChange={(next) => handleQuantity(item.id, next)}
                      max={maxQty}
                      disabled={busy || !item.available}
                    />
                    <span className="cart-line-total">{formatCurrency(item.subtotal)}</span>
                    <button
                      type="button"
                      className="link-danger"
                      onClick={() => handleRemove(item.id)}
                      disabled={busy}
                    >
                      <Icon name="trash" size={13} /> Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <aside className="summary-card">
            <h3>Order Summary</h3>

            <div className="summary-row">
              <span>Subtotal ({data.item_count} item{data.item_count === 1 ? '' : 's'})</span>
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

            <Link
              to="/checkout"
              className={`btn btn-primary btn-lg btn-block ${issues.length ? 'disabled' : ''}`}
              style={{ marginTop: 'var(--sp-4)', pointerEvents: issues.length ? 'none' : undefined, opacity: issues.length ? 0.55 : 1 }}
              aria-disabled={issues.length > 0}
            >
              Proceed to checkout <Icon name="arrowRight" size={17} />
            </Link>

            <Link to="/products" className="btn btn-ghost btn-block" style={{ marginTop: 'var(--sp-2)' }}>
              Continue shopping
            </Link>

            <p className="text-xs text-muted text-center" style={{ marginTop: 'var(--sp-4)' }}>
              <Icon name="shield" size={13} /> No online payment. Pay when you collect or receive your order.
            </p>
          </aside>
        </div>
      ) : (
        <EmptyState
          icon="cart"
          title="Your cart is empty"
          description="Browse our designs and add something you would like stitched."
          action={<Link to="/products" className="btn btn-primary">Browse products</Link>}
        />
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Clear your cart?"
        message="This removes every item from your cart. Your wishlist won't be affected."
        confirmLabel="Clear cart"
        busy={clearing}
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}
