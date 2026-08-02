import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { useApi, usePageTitle } from '../../hooks/useApi'
import { formatCurrency, formatDate, initials } from '../../api/format'
import { MEASUREMENT_FIELDS } from '../../api/measurements'
import Icon from '../../components/Icon'
import { ConfirmDialog, EmptyState, Skeleton, StatusBadge, Stars } from '../../components/ui'

export default function UserDetail() {
  const { userId } = useParams()
  usePageTitle('Customer details')
  const { showToast } = useToast()
  const { data, loading, error, reload } = useApi(`/api/admin/users/${userId}`)

  const [confirmToggle, setConfirmToggle] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleToggle = async () => {
    setBusy(true)
    try {
      const result = await api.put(`/api/admin/users/${userId}/toggle`)
      showToast(result.message, 'success')
      setConfirmToggle(false)
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
        <Skeleton height={36} width={220} style={{ marginBottom: 24 }} />
        <Skeleton height={400} radius="var(--radius)" />
      </>
    )
  }

  if (error || !data) {
    return (
      <EmptyState
        icon="alertCircle"
        title="Customer not found"
        description="That account doesn't exist or has been removed."
        action={<Link to="/admin/users" className="btn btn-primary">Back to customers</Link>}
      />
    )
  }

  const { user, orders, total_spent: totalSpent, reviews } = data
  const measurements = user.measurements || {}
  const hasMeasurements = Object.keys(measurements).length > 0

  return (
    <>
      <div className="page-header">
        <div>
          <div className="row" style={{ gap: 12 }}>
            <h2>{user.username}</h2>
            {!user.is_active_account && <span className="badge badge-cancelled">Suspended</span>}
          </div>
          <p>Member since {formatDate(user.created_at)}</p>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <Link to="/admin/users" className="btn btn-ghost btn-sm">
            <Icon name="chevronLeft" size={15} /> All customers
          </Link>
          <button
            type="button"
            className={`btn btn-sm ${user.is_active_account ? 'btn-subtle' : 'btn-primary'}`}
            onClick={() => setConfirmToggle(true)}
          >
            <Icon name={user.is_active_account ? 'slash' : 'checkCircle'} size={15} />
            {user.is_active_account ? 'Suspend account' : 'Reinstate account'}
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="row" style={{ gap: 16, marginBottom: 'var(--sp-4)', flexWrap: 'nowrap' }}>
            <span className="profile-avatar-large" style={{ width: 60, height: 60, fontSize: 'var(--text-lg)', marginBottom: 0 }}>
              {initials(user.username)}
            </span>
            <div>
              <h3 style={{ margin: 0 }}>{user.username}</h3>
              <p className="text-muted text-sm">{user.email}</p>
            </div>
          </div>

          <div className="profile-info-grid">
            <div className="profile-info-item">
              <span className="profile-label">Phone</span>
              <span className="profile-value">{user.phone || 'Not set'}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-label">Address</span>
              <span className="profile-value">{user.address || 'Not set'}</span>
            </div>
          </div>

          <div className="divider" />

          <h3 style={{ marginBottom: 'var(--sp-3)', fontSize: 'var(--text-base)' }}>
            Saved measurements
          </h3>
          {hasMeasurements ? (
            <div className="measurement-chips">
              {MEASUREMENT_FIELDS.filter(({ key }) => measurements[key]).map(({ key, label }) => (
                <span className="measurement-chip" key={key}>
                  <span className="m-label">{label}</span>
                  <span className="m-value">{measurements[key]}"</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">This customer hasn't saved measurements yet.</p>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 'var(--sp-4)' }}>Order summary</h3>

          <div className="stat-cards" style={{ marginBottom: 0 }}>
            <div className="stat-card">
              <div className="stat-number">{orders.length}</div>
              <div className="stat-label">Total orders</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{formatCurrency(totalSpent, 0)}</div>
              <div className="stat-label">Total spent</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{reviews.length}</div>
              <div className="stat-label">Reviews written</div>
            </div>
          </div>
        </div>
      </div>

      <h3 style={{ margin: 'var(--sp-5) 0 var(--sp-3)' }}>Order history</h3>
      {orders.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th className="num">Items</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><strong>#{order.id}</strong></td>
                  <td>{formatDate(order.created_at, true)}</td>
                  <td className="num">{order.item_count}</td>
                  <td className="num">{formatCurrency(order.total_amount)}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td>
                    <Link to={`/admin/orders/${order.id}`} className="btn btn-outline btn-sm">
                      View order
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="package"
          title="No orders"
          description="This customer hasn't placed any orders yet."
        />
      )}

      {reviews.length > 0 && (
        <>
          <h3 style={{ margin: 'var(--sp-5) 0 var(--sp-3)' }}>Reviews written</h3>
          <div className="review-list">
            {reviews.map((review) => (
              <article className="review-item" key={review.id}>
                <div className="review-head">
                  <Stars value={review.rating} />
                  <span className="spacer" />
                  <span className="review-date">{formatDate(review.created_at)}</span>
                </div>
                {review.title && <h4>{review.title}</h4>}
                {review.comment && <p>{review.comment}</p>}
              </article>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmToggle}
        title={user.is_active_account ? `Suspend ${user.username}?` : `Reinstate ${user.username}?`}
        message={
          user.is_active_account
            ? 'They will be unable to log in until reinstated. Their order history is kept.'
            : 'They will be able to log in and place orders again.'
        }
        confirmLabel={user.is_active_account ? 'Suspend account' : 'Reinstate account'}
        tone={user.is_active_account ? 'danger' : 'primary'}
        busy={busy}
        onConfirm={handleToggle}
        onCancel={() => setConfirmToggle(false)}
      />
    </>
  )
}
