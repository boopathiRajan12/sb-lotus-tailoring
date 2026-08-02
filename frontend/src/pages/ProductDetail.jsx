import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useWishlist } from '../context/WishlistContext'
import { useApi, usePageTitle } from '../hooks/useApi'
import { formatCurrency, formatRelative, initials } from '../api/format'
import { MEASUREMENT_FIELDS } from '../api/measurements'
import ProductCard, { onImageError } from '../components/ProductCard'
import Icon from '../components/Icon'
import {
  EmptyState, Modal, ProductGridSkeleton, QuantityStepper,
  RatingInput, Skeleton, Stars,
} from '../components/ui'

const DEFAULT_IMAGE = '/default-product.svg'

export default function ProductDetail() {
  const { productId } = useParams()
  const { user, refresh } = useAuth()
  const { showToast } = useToast()
  const { isSaved, toggle } = useWishlist()

  const { data, loading, error, reload } = useApi(`/api/products/${productId}`)

  const [activeIndex, setActiveIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [measurements, setMeasurements] = useState({})
  const [showPreview, setShowPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState('details')
  const [reviewOpen, setReviewOpen] = useState(false)

  const product = data?.product
  usePageTitle(product?.name)

  // Reset per-product UI state whenever the route id changes.
  useEffect(() => {
    setActiveIndex(0)
    setZoomed(false)
    setQuantity(1)
    setShowPreview(false)
    setTab('details')
  }, [productId])

  // Pre-fill the measurement form from the customer's saved profile.
  useEffect(() => {
    if (user?.measurements) setMeasurements(user.measurements)
  }, [user])

  const images = product?.images || []
  const activeImage = images[activeIndex]
  // Memoised off `data` so the identity is stable between renders; deriving it
  // inline would defeat the `myReview` memo below.
  const reviews = useMemo(() => data?.reviews || [], [data])
  const distribution = data?.rating_distribution || {}
  const myReview = useMemo(
    () => reviews.find((r) => r.user_id === user?.id) || null,
    [reviews, user],
  )

  if (loading) return <ProductDetailSkeleton />

  if (error || !product) {
    return (
      <div className="container page">
        <EmptyState
          icon="alertCircle"
          title="Product not found"
          description="This design may have been removed or is no longer available."
          action={<Link to="/products" className="btn btn-primary">Browse all products</Link>}
        />
      </div>
    )
  }

  const outOfStock = !product.is_made_to_order && product.stock <= 0
  const saved = isSaved(product.id)

  const handlePreview = () => {
    const missing = MEASUREMENT_FIELDS
      .filter((field) => field.required && !measurements[field.key]?.toString().trim())
      .map((field) => field.label)

    if (missing.length) {
      showToast(`Please fill in: ${missing.join(', ')}.`, 'danger')
      return
    }
    setShowPreview(true)
  }

  const handleAddToCart = async () => {
    setSubmitting(true)
    try {
      const payload = { product_id: product.id, quantity }
      if (product.is_custom_blouse) {
        const cleaned = {}
        MEASUREMENT_FIELDS.forEach(({ key }) => {
          const value = measurements[key]?.toString().trim()
          if (value) cleaned[key] = value
        })
        payload.measurements = cleaned
      }

      const result = await api.post('/api/cart/items', payload)
      showToast(result.message, 'success')
      refresh()
      if (product.is_custom_blouse) setShowPreview(false)
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  const saveMeasurementsToProfile = async () => {
    try {
      const result = await api.put('/api/auth/measurements', { measurements })
      showToast(result.message, 'success')
      refresh()
    } catch (err) {
      showToast(err.message, 'danger')
    }
  }

  const step = (delta) => {
    if (!images.length) return
    setActiveIndex((current) => (current + delta + images.length) % images.length)
  }

  return (
    <div className="container">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="sep">/</span>
        <Link to="/products">Products</Link>
        {product.category && (
          <>
            <span className="sep">/</span>
            <Link to={`/products?category=${product.category_id}`}>{product.category.name}</Link>
          </>
        )}
        <span className="sep">/</span>
        <span>{product.name}</span>
      </nav>

      <div className="product-detail">
        <div className="gallery">
          <div
            className={`gallery-main ${zoomed ? 'zoomed' : ''}`}
            onClick={() => setZoomed((z) => !z)}
            role="button"
            tabIndex={0}
            aria-label="Toggle image zoom"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setZoomed((z) => !z) } }}
          >
            <img
              src={activeImage ? activeImage.url : DEFAULT_IMAGE}
              alt={product.name}
              onError={onImageError}
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="gallery-nav prev"
                  onClick={(e) => { e.stopPropagation(); step(-1) }}
                  aria-label="Previous image"
                >
                  <Icon name="chevronLeft" size={18} />
                </button>
                <button
                  type="button"
                  className="gallery-nav next"
                  onClick={(e) => { e.stopPropagation(); step(1) }}
                  aria-label="Next image"
                >
                  <Icon name="chevronRight" size={18} />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="gallery-thumbs">
              {images.map((img, index) => (
                <button
                  key={img.id}
                  type="button"
                  className={index === activeIndex ? 'active' : ''}
                  onClick={() => { setActiveIndex(index); setZoomed(false) }}
                  aria-label={`View image ${index + 1}`}
                >
                  <img src={img.url} alt="" onError={onImageError} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-info">
          {product.category && (
            <Link to={`/products?category=${product.category_id}`} className="category-tag">
              {product.category.name}
            </Link>
          )}

          <h1>{product.name}</h1>

          {product.rating_count > 0 ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ padding: 0 }}
              onClick={() => setTab('reviews')}
            >
              <Stars value={product.rating_avg} size={16} showValue count={product.rating_count} />
            </button>
          ) : (
            <span className="text-muted text-sm">No reviews yet</span>
          )}

          <div className="product-price-block">
            <span className="price">{formatCurrency(product.price)}</span>
            {product.compare_at_price > product.price && (
              <>
                <span className="price-strike">{formatCurrency(product.compare_at_price)}</span>
                <span className="price-save">Save {product.discount_percent}%</span>
              </>
            )}
          </div>

          <div className="product-meta">
            <div className="product-meta-row">
              <Icon name="package" size={16} />
              <span className="label">Availability</span>
              <strong>
                {product.is_made_to_order
                  ? 'Made to order'
                  : outOfStock ? 'Out of stock' : `${product.stock} in stock`}
              </strong>
            </div>
            {data.units_sold > 0 && (
              <div className="product-meta-row">
                <Icon name="award" size={16} />
                <span className="label">Ordered</span>
                <strong>{data.units_sold} time{data.units_sold > 1 ? 's' : ''}</strong>
              </div>
            )}
            <div className="product-meta-row">
              <Icon name="truck" size={16} />
              <span className="label">Payment</span>
              <strong>Pay on delivery or pickup</strong>
            </div>
          </div>

          {product.is_custom_blouse && (
            <div className="callout">
              <Icon name="ruler" size={20} />
              <div>
                <strong>Custom blouse design</strong>
                Enter your measurements below and we will stitch this design to fit you exactly.
              </div>
            </div>
          )}

          {user && !user.is_admin ? (
            <>
              {!product.is_custom_blouse && (
                <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
                  <span className="form-label" style={{ margin: 0 }}>Quantity</span>
                  <QuantityStepper
                    value={quantity}
                    onChange={setQuantity}
                    max={product.is_made_to_order ? 20 : Math.max(1, product.stock)}
                    disabled={outOfStock}
                  />
                </div>
              )}

              {product.is_custom_blouse ? (
                !showPreview ? (
                  <div className="measurement-form">
                    <h3>Your measurements</h3>
                    <span className="form-hint">
                      All values in inches. Bust, waist, and shoulder are required.
                      {user.measurements && Object.keys(user.measurements).length > 0 &&
                        ' Pre-filled from your saved profile.'}
                    </span>

                    <div className="measurement-grid">
                      {MEASUREMENT_FIELDS.map(({ key, label, required }) => (
                        <div className="form-group" key={key}>
                          <label htmlFor={`m-${key}`}>
                            {label}{required && ' *'}
                          </label>
                          <input
                            id={`m-${key}`}
                            type="text"
                            inputMode="decimal"
                            className="form-control"
                            placeholder="e.g. 36"
                            value={measurements[key] || ''}
                            onChange={(e) => setMeasurements((m) => ({ ...m, [key]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
                      <button type="button" className="btn btn-primary" onClick={handlePreview}>
                        <Icon name="check" size={16} /> Review measurements
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={saveMeasurementsToProfile}>
                        <Icon name="save" size={15} /> Save to my profile
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="measurement-preview-card">
                    <h3>Confirm your measurements</h3>
                    <div className="measurement-preview-grid">
                      {MEASUREMENT_FIELDS.map(({ key, label }) => (
                        <div className="measurement-preview-item" key={key}>
                          <span className="preview-label">{label}</span>
                          <span className="preview-value">
                            {measurements[key]?.toString().trim() || '-'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="row" style={{ marginTop: 'var(--sp-5)' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-lg"
                        disabled={submitting}
                        onClick={handleAddToCart}
                      >
                        {submitting ? <span className="spinner" /> : <Icon name="cart" size={17} />}
                        Confirm &amp; add to cart
                      </button>
                      <button
                        type="button"
                        className="btn btn-subtle"
                        onClick={() => setShowPreview(false)}
                      >
                        <Icon name="edit" size={15} /> Edit
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="buy-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    disabled={submitting || outOfStock}
                    onClick={handleAddToCart}
                  >
                    {submitting ? <span className="spinner" /> : <Icon name="cart" size={17} />}
                    {outOfStock ? 'Out of stock' : 'Add to cart'}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-outline btn-lg ${saved ? 'saved' : ''}`}
                    onClick={() => toggle(product)}
                  >
                    <Icon name="heart" size={17} fill={saved ? 'currentColor' : 'none'} />
                    {saved ? 'Saved' : 'Save'}
                  </button>
                </div>
              )}
            </>
          ) : !user ? (
            <div className="buy-actions">
              <Link to="/login" className="btn btn-primary btn-lg">
                <Icon name="user" size={17} /> Log in to order
              </Link>
              <Link to="/register" className="btn btn-outline btn-lg">Create account</Link>
            </div>
          ) : (
            <div className="callout">
              <Icon name="info" size={20} />
              <div>You are signed in as an admin. Switch to a customer account to place orders.</div>
            </div>
          )}
        </div>
      </div>

      <section className="section-sm">
        <div className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'details'}
            className={tab === 'details' ? 'active' : ''}
            onClick={() => setTab('details')}
          >
            Description
          </button>
          <button
            role="tab"
            aria-selected={tab === 'reviews'}
            className={tab === 'reviews' ? 'active' : ''}
            onClick={() => setTab('reviews')}
          >
            Reviews <span className="tab-count">{product.rating_count}</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === 'care'}
            className={tab === 'care' ? 'active' : ''}
            onClick={() => setTab('care')}
          >
            Measuring &amp; care
          </button>
        </div>

        {tab === 'details' && (
          <div className="card fade-in">
            {product.description ? (
              <p className="description" style={{ margin: 0 }}>{product.description}</p>
            ) : (
              <p className="text-muted">
                No description has been added for this design yet. Visit the shop or call us
                for fabric and finishing details.
              </p>
            )}
          </div>
        )}

        {tab === 'reviews' && (
          <div className="fade-in">
            <ReviewsPanel
              product={product}
              reviews={reviews}
              distribution={distribution}
              myReview={myReview}
              canReview={Boolean(user && !user.is_admin)}
              onWrite={() => setReviewOpen(true)}
              onDeleted={reload}
            />
          </div>
        )}

        {tab === 'care' && (
          <div className="card fade-in">
            <h3 style={{ marginBottom: 'var(--sp-3)' }}>How to measure</h3>
            <ul style={{ paddingLeft: 20, color: 'var(--text-light)', lineHeight: 2, fontSize: 'var(--text-sm)' }}>
              <li><strong>Bust</strong> - around the fullest part of the chest, tape level.</li>
              <li><strong>Waist</strong> - around the narrowest part, just above the navel.</li>
              <li><strong>Shoulder</strong> - from one shoulder edge across the back to the other.</li>
              <li><strong>Sleeve length</strong> - from shoulder edge down to where the sleeve should end.</li>
              <li><strong>Blouse length</strong> - from shoulder top down to the desired hem.</li>
              <li><strong>Arm hole</strong> - around the arm at the armpit, kept comfortably loose.</li>
            </ul>
            <div className="divider" />
            <h3 style={{ marginBottom: 'var(--sp-3)' }}>Care</h3>
            <p className="text-light text-sm">
              Hand wash or gentle machine cycle in cold water. Dry in shade to protect the
              colour. Iron on medium heat, and use a cloth over embroidery or delicate fabric.
            </p>
          </div>
        )}
      </section>

      {(data.related_products || []).length > 0 && (
        <section className="section">
          <h2 className="section-title">You might also like</h2>
          <div className="product-grid">
            {data.related_products.map((rp) => (
              <ProductCard key={rp.id} product={rp} showCategory={false} />
            ))}
          </div>
        </section>
      )}

      <ReviewDialog
        open={reviewOpen}
        product={product}
        existing={myReview}
        onClose={() => setReviewOpen(false)}
        onSaved={() => { setReviewOpen(false); reload() }}
      />
    </div>
  )
}

/* ── Reviews ───────────────────────────────────────────────── */

function ReviewsPanel({ product, reviews, distribution, myReview, canReview, onWrite, onDeleted }) {
  const { showToast } = useToast()
  const total = product.rating_count || 0

  const handleDelete = async (reviewId) => {
    try {
      const result = await api.del(`/api/reviews/${reviewId}`)
      showToast(result.message, 'info')
      onDeleted()
    } catch (err) {
      showToast(err.message, 'danger')
    }
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="rating-summary">
          <div className="rating-score">
            <div className="score-value">{total ? Number(product.rating_avg).toFixed(1) : '-'}</div>
            <Stars value={product.rating_avg} size={18} />
            <div className="score-count">
              {total} review{total === 1 ? '' : 's'}
            </div>
          </div>

          <div className="rating-bars">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[String(star)] || 0
              const percent = total ? (count / total) * 100 : 0
              return (
                <div className="rating-bar-row" key={star}>
                  <span>{star} star</span>
                  <div className="rating-bar-track">
                    <div className="rating-bar-fill" style={{ width: `${percent}%` }} />
                  </div>
                  <span>{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {canReview && (
          <div style={{ marginTop: 'var(--sp-5)', textAlign: 'center' }}>
            <button type="button" className="btn btn-primary" onClick={onWrite}>
              <Icon name="edit" size={16} />
              {myReview ? 'Edit your review' : 'Write a review'}
            </button>
          </div>
        )}
      </div>

      {reviews.length > 0 ? (
        <div className="review-list">
          {reviews.map((review) => (
            <article className="review-item" key={review.id}>
              <div className="review-head">
                <span className="avatar-sm">{initials(review.username)}</span>
                <div>
                  <div className="review-author">{review.username}</div>
                  <div className="review-date">{formatRelative(review.created_at)}</div>
                </div>
                <span className="spacer" />
                {review.is_verified && (
                  <span className="badge badge-verified">
                    <Icon name="checkCircle" size={12} /> Verified purchase
                  </span>
                )}
                {myReview?.id === review.id && (
                  <button
                    type="button"
                    className="link-danger"
                    onClick={() => handleDelete(review.id)}
                  >
                    <Icon name="trash" size={13} /> Delete
                  </button>
                )}
              </div>

              <Stars value={review.rating} />
              {review.title && <h4 style={{ marginTop: 6 }}>{review.title}</h4>}
              {review.comment && <p>{review.comment}</p>}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="message"
          title="No reviews yet"
          description="Be the first to share how this design turned out."
        />
      )}
    </>
  )
}

function ReviewDialog({ open, product, existing, onClose, onSaved }) {
  const { showToast } = useToast()
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load the existing review into the form each time the dialog opens.
  useEffect(() => {
    if (!open) return
    setRating(existing?.rating || 5)
    setTitle(existing?.title || '')
    setComment(existing?.comment || '')
  }, [open, existing])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = await api.post('/api/reviews', {
        product_id: product.id, rating, title, comment,
      })
      showToast(result.message, 'success')
      onSaved()
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit your review' : `Review ${product?.name}`}
      footer={
        <>
          <button type="button" className="btn btn-subtle" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" form="review-form" className="btn btn-primary" disabled={submitting}>
            {submitting && <span className="spinner" />}
            {existing ? 'Update review' : 'Post review'}
          </button>
        </>
      }
    >
      <form id="review-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Your rating</label>
          <RatingInput value={rating} onChange={setRating} disabled={submitting} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="review-title">Headline</label>
          <input
            id="review-title"
            type="text"
            className="form-control"
            maxLength={150}
            placeholder="Sums up your experience"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="review-comment">Your review</label>
          <textarea
            id="review-comment"
            className="form-control"
            rows="4"
            maxLength={2000}
            placeholder="How was the fit, fabric, and finishing?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  )
}

function ProductDetailSkeleton() {
  return (
    <div className="container">
      <div className="product-detail">
        <div>
          <Skeleton height={0} style={{ aspectRatio: '1 / 1', borderRadius: 'var(--radius)' }} />
          <div className="row" style={{ marginTop: 12 }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} width={68} height={68} radius="var(--radius-xs)" />)}
          </div>
        </div>
        <div>
          <Skeleton width={110} height={22} radius="var(--radius-full)" />
          <Skeleton width="80%" height={36} style={{ margin: '16px 0' }} />
          <Skeleton width={150} height={30} />
          <div style={{ marginTop: 28 }}>
            <Skeleton height={12} style={{ marginBottom: 10 }} />
            <Skeleton height={12} style={{ marginBottom: 10 }} />
            <Skeleton height={12} width="70%" />
          </div>
          <Skeleton height={48} radius="var(--radius)" style={{ marginTop: 32 }} />
        </div>
      </div>
      <ProductGridSkeleton count={4} />
    </div>
  )
}
