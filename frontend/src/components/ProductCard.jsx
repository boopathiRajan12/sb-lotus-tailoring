import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../api/client'
import { formatCurrency } from '../api/format'

const DEFAULT_IMAGE = '/default-product.svg'

export function productImageUrl(product) {
  return product.images && product.images.length > 0 ? product.images[0].url : DEFAULT_IMAGE
}

export default function ProductCard({ product, showCategory = true }) {
  const { user, refresh } = useAuth()
  const { showToast } = useToast()

  const handleAddToCart = async () => {
    try {
      const data = await api.post('/api/cart/items', { product_id: product.id, quantity: 1 })
      showToast(data.message, 'success')
      refresh()
    } catch (err) {
      showToast(err.message, 'danger')
    }
  }

  return (
    <div className="product-card">
      <Link to={`/products/${product.id}`}>
        <img
          src={productImageUrl(product)}
          alt={product.name}
          className="product-card-img"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_IMAGE }}
        />
      </Link>
      <div className="product-card-body">
        {showCategory && product.category && (
          <span className="category-tag">{product.category.name}</span>
        )}
        <h3>{product.name}</h3>
        <div className="price">{formatCurrency(product.price)}</div>
      </div>
      <div className="product-card-footer">
        <Link to={`/products/${product.id}`} className="btn btn-outline btn-sm">View Details</Link>
        {user && !user.is_admin && (
          <button type="button" className="btn btn-primary btn-sm" onClick={handleAddToCart}>Add to Cart</button>
        )}
        {!user && (
          <Link to="/login" className="btn btn-primary btn-sm">Add to Cart</Link>
        )}
      </div>
    </div>
  )
}
