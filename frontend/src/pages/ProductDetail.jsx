import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatCurrency } from '../api/format'
import ProductCard from '../components/ProductCard'

const MEASUREMENT_FIELDS = [
  { key: 'bust', label: 'Bust' },
  { key: 'waist', label: 'Waist' },
  { key: 'shoulder', label: 'Shoulder' },
  { key: 'sleeve', label: 'Sleeve Length' },
  { key: 'blength', label: 'Blouse Length' },
  { key: 'armhole', label: 'Arm Hole' },
]
const DEFAULT_IMAGE = '/default-product.svg'

export default function ProductDetail() {
  const { productId } = useParams()
  const { user, refresh } = useAuth()
  const { showToast } = useToast()

  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [activeImage, setActiveImage] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [measurements, setMeasurements] = useState({})
  const [showPreview, setShowPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setShowPreview(false)
    setMeasurements({})
    setQuantity(1)
    api.get(`/api/products/${productId}`).then((data) => {
      setProduct(data.product)
      setRelatedProducts(data.related_products)
      setActiveImage(data.product.images[0] || null)
    })
  }, [productId])

  if (!product) return null

  const handlePreview = () => {
    if (!measurements.bust?.trim() || !measurements.waist?.trim() || !measurements.shoulder?.trim()) {
      showToast('Please fill in at least Bust, Waist, and Shoulder measurements.', 'danger')
      return
    }
    setShowPreview(true)
  }

  const handleAddToCart = async () => {
    setSubmitting(true)
    try {
      const cleaned = {}
      MEASUREMENT_FIELDS.forEach(({ key }) => {
        if (measurements[key]?.trim()) cleaned[key] = measurements[key].trim()
      })
      const payload = { product_id: product.id, quantity }
      if (product.is_custom_blouse) payload.measurements = cleaned

      const data = await api.post('/api/cart/items', payload)
      showToast(data.message, 'success')
      refresh()
      if (product.is_custom_blouse) {
        setShowPreview(false)
        setMeasurements({})
      }
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container">
      <div className="product-detail">
        <div className="product-images">
          <img
            src={activeImage ? activeImage.url : DEFAULT_IMAGE}
            alt={product.name}
            className="product-main-img"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_IMAGE }}
          />
          {product.images.length > 1 && (
            <div className="product-thumbnails">
              {product.images.map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt={product.name}
                  className={activeImage && activeImage.id === img.id ? 'active' : ''}
                  onClick={() => setActiveImage(img)}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_IMAGE }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="product-info">
          {product.category && (
            <span className="category-tag" style={{ marginBottom: 10 }}>{product.category.name}</span>
          )}
          <h1>{product.name}</h1>
          <div className="price">{formatCurrency(product.price)}</div>

          {product.description && <div className="description">{product.description}</div>}

          {product.is_custom_blouse && (
            <div style={{ background: 'var(--accent)', padding: '12px 18px', borderRadius: 'var(--radius)', marginBottom: 20 }}>
              <strong>Custom Blouse Design</strong> - Select this design and provide your measurements for a perfect fit.
            </div>
          )}

          {user && !user.is_admin ? (
            <>
              <div className="form-group">
                <label htmlFor="quantity">Quantity</label>
                <input
                  type="number"
                  id="quantity"
                  className="form-control"
                  style={{ maxWidth: 100 }}
                  min="1"
                  max="10"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                />
              </div>

              {product.is_custom_blouse ? (
                !showPreview ? (
                  <div className="measurement-form">
                    <h3>Enter Your Measurements (in inches)</h3>
                    <div className="measurement-grid">
                      {MEASUREMENT_FIELDS.map(({ key, label }) => (
                        <div className="form-group" key={key}>
                          <label>{label}</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder={`e.g., 36`}
                            value={measurements[key] || ''}
                            onChange={(e) => setMeasurements((m) => ({ ...m, [key]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                    <button type="button" className="btn btn-secondary btn-lg" style={{ marginTop: 15 }} onClick={handlePreview}>
                      Preview Measurements
                    </button>
                  </div>
                ) : (
                  <div className="measurement-preview-card">
                    <h3>Your Measurements</h3>
                    <div className="measurement-preview-grid">
                      {MEASUREMENT_FIELDS.map(({ key, label }) => (
                        <div className="measurement-preview-item" key={key}>
                          <span className="preview-label">{label}</span>
                          <span className="preview-value">{measurements[key]?.trim() ? `${measurements[key].trim()} inches` : '-'}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                      <button type="button" className="btn btn-primary btn-lg" disabled={submitting} onClick={handleAddToCart}>
                        Confirm &amp; Add to Cart
                      </button>
                      <button type="button" className="btn btn-outline btn-lg" onClick={() => setShowPreview(false)}>
                        Edit Measurements
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <button type="button" className="btn btn-primary btn-lg" style={{ marginTop: 15 }} disabled={submitting} onClick={handleAddToCart}>
                  Add to Cart
                </button>
              )}
            </>
          ) : !user ? (
            <>
              <Link to="/login" className="btn btn-primary btn-lg" style={{ marginTop: 15 }}>Login to Add to Cart</Link>
              <Link to="/register" className="btn btn-outline btn-lg" style={{ marginTop: 15, marginLeft: 10 }}>Register</Link>
            </>
          ) : null}
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section style={{ padding: '40px 0' }}>
          <h2 className="section-title">Related Products</h2>
          <div className="product-grid">
            {relatedProducts.map((rp) => (
              <ProductCard key={rp.id} product={rp} showCategory={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
