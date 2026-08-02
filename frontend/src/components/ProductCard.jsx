import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useWishlist } from '../context/WishlistContext'
import { api } from '../api/client'
import { formatCurrency } from '../api/format'
import { Stars } from './ui'
import Icon from './Icon'

const DEFAULT_IMAGE = '/default-product.svg'
// Anything added in the last two weeks earns a "New" flag.
const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

export function productImageUrl(product) {
  return product?.images?.length ? product.images[0].url : DEFAULT_IMAGE
}

export function onImageError(event) {
  event.currentTarget.onerror = null
  event.currentTarget.src = DEFAULT_IMAGE
}

function isNew(product) {
  if (!product.created_at) return false
  return Date.now() - new Date(product.created_at).getTime() < NEW_WINDOW_MS
}

export default function ProductCard({ product, showCategory = true }) {
  const { user, refresh } = useAuth()
  const { isSaved, toggle } = useWishlist()
  const { showToast } = useToast()
  const [adding, setAdding] = useState(false)

  const outOfStock = !product.is_made_to_order && product.stock <= 0
  const saved = isSaved(product.id)

  const handleAddToCart = async () => {
    setAdding(true)
    try {
      const data = await api.post('/api/cart/items', { product_id: product.id, quantity: 1 })
      showToast(data.message, 'success')
      refresh()
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setAdding(false)
    }
  }

  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-card-media" aria-label={product.name}>
        <img
          src={productImageUrl(product)}
          alt={product.name}
          className="product-card-img"
          loading="lazy"
          onError={onImageError}
        />

        <div className="product-badges">
          {product.discount_percent > 0 && (
            <span className="product-flag flag-sale">-{product.discount_percent}%</span>
          )}
          {product.is_custom_blouse && <span className="product-flag flag-custom">Custom</span>}
          {outOfStock && <span className="product-flag flag-out">Out of stock</span>}
          {!outOfStock && isNew(product) && <span className="product-flag flag-new">New</span>}
        </div>
      </Link>

      {user && !user.is_admin && (
        <button
          type="button"
          className={`wishlist-btn ${saved ? 'saved' : ''}`}
          onClick={() => toggle(product)}
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <Icon name="heart" size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
      )}

      <div className="product-card-body">
        {showCategory && product.category && (
          <span className="category-tag">{product.category.name}</span>
        )}

        <h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3>

        {product.rating_count > 0 && (
          <Stars value={product.rating_avg} count={product.rating_count} />
        )}

        <div className="price-row">
          <span className="price">{formatCurrency(product.price)}</span>
          {product.compare_at_price > product.price && (
            <span className="price-strike">{formatCurrency(product.compare_at_price)}</span>
          )}
        </div>
      </div>

      <div className="product-card-footer">
        <Link to={`/products/${product.id}`} className="btn btn-outline btn-sm">Details</Link>

        {user && !user.is_admin && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleAddToCart}
            disabled={adding || outOfStock}
          >
            {adding ? <span className="spinner" /> : <Icon name="cart" size={15} />}
            {outOfStock ? 'Unavailable' : 'Add'}
          </button>
        )}

        {!user && (
          <Link to="/login" className="btn btn-primary btn-sm">
            <Icon name="cart" size={15} /> Add
          </Link>
        )}
      </div>
    </article>
  )
}
