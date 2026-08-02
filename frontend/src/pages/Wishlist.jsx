import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useWishlist } from '../context/WishlistContext'
import { useApi, usePageTitle } from '../hooks/useApi'
import { formatCurrency, formatRelative } from '../api/format'
import { onImageError } from '../components/ProductCard'
import Icon from '../components/Icon'
import { EmptyState, ProductGridSkeleton, Stars } from '../components/ui'

export default function Wishlist() {
  usePageTitle('Wishlist')
  const { refresh: refreshUser } = useAuth()
  const { refresh: refreshWishlist } = useWishlist()
  const { showToast } = useToast()
  const { data, loading, error, reload } = useApi('/api/wishlist')
  const [busyId, setBusyId] = useState(null)

  const items = data?.items || []

  const afterChange = () => {
    reload()
    refreshUser()
    refreshWishlist()
  }

  const handleRemove = async (productId) => {
    setBusyId(productId)
    try {
      const result = await api.del(`/api/wishlist/${productId}`)
      showToast(result.message, 'info')
      afterChange()
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setBusyId(null)
    }
  }

  const handleMoveToCart = async (productId) => {
    setBusyId(productId)
    try {
      const result = await api.post(`/api/wishlist/${productId}/move-to-cart`)
      showToast(result.message, 'success')
      afterChange()
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="container page">
        <h2 className="section-title">My Wishlist</h2>
        <ProductGridSkeleton count={4} />
      </div>
    )
  }

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h2>My Wishlist</h2>
          <p>{items.length} saved design{items.length === 1 ? '' : 's'}</p>
        </div>
        <Link to="/products" className="btn btn-ghost btn-sm">
          Continue shopping <Icon name="arrowRight" size={15} />
        </Link>
      </div>

      {error ? (
        <EmptyState
          icon="alertCircle"
          title="Couldn't load your wishlist"
          description="Please refresh the page and try again."
        />
      ) : items.length > 0 ? (
        <div className="cart-lines fade-in">
          {items.map(({ id, product, added_at: addedAt }) => {
            if (!product) return null
            const outOfStock = !product.is_made_to_order && product.stock <= 0
            const busy = busyId === product.id

            return (
              <div className="cart-line" key={id}>
                <Link to={`/products/${product.id}`}>
                  <img
                    className="cart-line-img"
                    src={product.images?.[0]?.url || '/default-product.svg'}
                    alt={product.name}
                    onError={onImageError}
                  />
                </Link>

                <div className="cart-line-info">
                  {product.category && <span className="category-tag">{product.category.name}</span>}
                  <h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3>
                  {product.rating_count > 0 && (
                    <Stars value={product.rating_avg} count={product.rating_count} />
                  )}
                  <span className="text-xs text-muted">Saved {formatRelative(addedAt)}</span>
                  {outOfStock && (
                    <span className="badge badge-cancelled" style={{ alignSelf: 'flex-start' }}>
                      <Icon name="slash" size={12} /> Out of stock
                    </span>
                  )}
                </div>

                <div className="cart-line-side">
                  <span className="price">{formatCurrency(product.price)}</span>
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleMoveToCart(product.id)}
                      disabled={busy || outOfStock}
                    >
                      {busy ? <span className="spinner" /> : <Icon name="cart" size={15} />}
                      Move to cart
                    </button>
                    <button
                      type="button"
                      className="link-danger"
                      onClick={() => handleRemove(product.id)}
                      disabled={busy}
                    >
                      <Icon name="trash" size={13} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon="heart"
          title="Your wishlist is empty"
          description="Tap the heart on any design to save it here for later."
          action={<Link to="/products" className="btn btn-primary">Browse products</Link>}
        />
      )}
    </div>
  )
}
