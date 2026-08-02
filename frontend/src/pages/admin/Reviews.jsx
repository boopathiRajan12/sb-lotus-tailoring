import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { useApi, usePageTitle } from '../../hooks/useApi'
import { formatDate, initials } from '../../api/format'
import Icon from '../../components/Icon'
import { CardsSkeleton, ConfirmDialog, EmptyState, Skeleton, Stars } from '../../components/ui'

const FILTERS = [
  { value: 'all', label: 'All reviews' },
  { value: 'low', label: 'Low ratings (1-2)' },
  { value: 'verified', label: 'Verified purchases' },
]

export default function Reviews() {
  usePageTitle('Admin Reviews')
  const { showToast } = useToast()
  const { data, loading, error, reload } = useApi('/api/admin/reviews')

  const [filter, setFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const reviews = useMemo(() => {
    const all = data?.reviews || []
    if (filter === 'low') return all.filter((r) => r.rating <= 2)
    if (filter === 'verified') return all.filter((r) => r.is_verified)
    return all
  }, [data, filter])

  const handleDelete = async () => {
    setBusy(true)
    try {
      const result = await api.del(`/api/reviews/${deleteTarget.id}`)
      showToast(result.message, 'success')
      setDeleteTarget(null)
      reload()
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <>
        <h2 style={{ marginBottom: 'var(--sp-5)' }}>Reviews</h2>
        <CardsSkeleton count={2} height={100} />
        <Skeleton height={320} radius="var(--radius)" />
      </>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon="alertCircle"
        title="Couldn't load reviews"
        description="Please refresh the page and try again."
      />
    )
  }

  const lowCount = (data.reviews || []).filter((r) => r.rating <= 2).length

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Reviews</h2>
          <p>What customers are saying about your work.</p>
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-head">
            <span className="stat-icon"><Icon name="message" size={17} /></span>
          </div>
          <div className="stat-number">{data.total}</div>
          <div className="stat-label">Total reviews</div>
        </div>
        <div className="stat-card">
          <div className="stat-head">
            <span className="stat-icon tone-success"><Icon name="star" size={17} /></span>
          </div>
          <div className="stat-number">{data.average_rating || '-'}</div>
          <div className="stat-label">Average rating</div>
          <div style={{ marginTop: 6 }}><Stars value={data.average_rating} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-head">
            <span className="stat-icon tone-warning"><Icon name="alertTriangle" size={17} /></span>
          </div>
          <div className="stat-number">{lowCount}</div>
          <div className="stat-label">Need attention</div>
        </div>
      </div>

      {data.total > 0 && (
        <div className="chip-row" style={{ marginBottom: 'var(--sp-5)' }}>
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`chip ${filter === option.value ? 'active' : ''}`}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {reviews.length > 0 ? (
        <div className="review-list fade-in">
          {reviews.map((review) => (
            <article className="review-item" key={review.id}>
              <div className="review-head">
                <span className="avatar-sm">{initials(review.username)}</span>
                <div>
                  <div className="review-author">{review.username}</div>
                  <div className="review-date">{formatDate(review.created_at, true)}</div>
                </div>

                <span className="spacer" />

                {review.is_verified && (
                  <span className="badge badge-verified">
                    <Icon name="checkCircle" size={12} /> Verified
                  </span>
                )}

                <Link to={`/products/${review.product_id}`} className="btn btn-ghost btn-sm">
                  {review.product_name || `Product #${review.product_id}`}
                </Link>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => setDeleteTarget(review)}
                  aria-label="Delete review"
                >
                  <Icon name="trash" size={14} />
                </button>
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
          title={data.total ? 'No reviews in this view' : 'No reviews yet'}
          description={
            data.total
              ? 'Try a different filter to see the rest.'
              : 'Reviews appear here once customers rate your products.'
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this review?"
        message="The review is removed permanently and the product's rating is recalculated."
        confirmLabel="Delete review"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
