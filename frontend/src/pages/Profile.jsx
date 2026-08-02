import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useApi, usePageTitle } from '../hooks/useApi'
import { formatCurrency, formatDate, initials, passwordStrength } from '../api/format'
import { MEASUREMENT_FIELDS } from '../api/measurements'
import Icon from '../components/Icon'
import { EmptyState, Skeleton, StatusBadge } from '../components/ui'

const TABS = [
  { key: 'orders', label: 'Orders', icon: 'package' },
  { key: 'details', label: 'My details', icon: 'user' },
  { key: 'measurements', label: 'Measurements', icon: 'ruler' },
  { key: 'security', label: 'Password', icon: 'lock' },
]

export default function Profile() {
  usePageTitle('My Profile')
  const { user, updateUser, refresh } = useAuth()
  const { showToast } = useToast()
  const { data, loading, reload } = useApi('/api/auth/profile')
  const [tab, setTab] = useState('orders')

  if (!user) return null

  const orders = data?.orders || []

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h2>My Profile</h2>
          <p>Your details, measurements, and order history.</p>
        </div>
      </div>

      <div className="profile-layout">
        <aside className="profile-card">
          <div className="profile-avatar-large">{initials(user.username)}</div>
          <h3 style={{ marginBottom: 4 }}>{user.username}</h3>
          <p className="text-muted text-sm" style={{ marginBottom: 'var(--sp-4)' }}>
            Member since {formatDate(user.created_at)}
          </p>

          <div className="profile-stats">
            <div className="stat-card" style={{ padding: 'var(--sp-3)' }}>
              <div className="stat-number">{loading ? '-' : data.order_count}</div>
              <div className="stat-label">Orders</div>
            </div>
            <div className="stat-card" style={{ padding: 'var(--sp-3)' }}>
              <div className="stat-number">{loading ? '-' : data.active_orders}</div>
              <div className="stat-label">In progress</div>
            </div>
            <div className="stat-card" style={{ padding: 'var(--sp-3)', gridColumn: '1 / -1' }}>
              <div className="stat-number">
                {loading ? '-' : formatCurrency(data.total_spent, 0)}
              </div>
              <div className="stat-label">Lifetime spend</div>
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'center', marginTop: 'var(--sp-4)' }}>
            <Link to="/wishlist" className="btn btn-ghost btn-sm">
              <Icon name="heart" size={15} /> Wishlist ({user.wishlist_count || 0})
            </Link>
          </div>
        </aside>

        <div>
          <div className="tabs" role="tablist">
            {TABS.map((item) => (
              <button
                key={item.key}
                role="tab"
                aria-selected={tab === item.key}
                className={tab === item.key ? 'active' : ''}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'orders' && (
            <OrdersTab orders={orders} loading={loading} />
          )}

          {tab === 'details' && (
            <DetailsTab
              user={user}
              onSaved={(updated) => { updateUser(updated); reload() }}
              showToast={showToast}
            />
          )}

          {tab === 'measurements' && (
            <MeasurementsTab user={user} refresh={refresh} showToast={showToast} />
          )}

          {tab === 'security' && <SecurityTab showToast={showToast} />}
        </div>
      </div>
    </div>
  )
}

/* ── Orders ────────────────────────────────────────────────── */

function OrdersTab({ orders, loading }) {
  if (loading) return <Skeleton height={280} radius="var(--radius)" />

  if (!orders.length) {
    return (
      <EmptyState
        icon="package"
        title="No orders yet"
        description="Start shopping and your orders will appear here."
        action={<Link to="/products" className="btn btn-primary">Browse products</Link>}
      />
    )
  }

  return (
    <div className="table-wrap fade-in">
      <table className="data-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Date</th>
            <th>Items</th>
            <th className="num">Total</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td><strong>#{order.id}</strong></td>
              <td>{formatDate(order.created_at)}</td>
              <td>{order.item_count}</td>
              <td className="num">{formatCurrency(order.total_amount)}</td>
              <td><StatusBadge status={order.status} /></td>
              <td>
                <Link to={`/my-orders/${order.id}`} className="btn btn-outline btn-sm">View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Contact details ───────────────────────────────────────── */

function DetailsTab({ user, onSaved, showToast }) {
  const [form, setForm] = useState({ email: '', phone: '', address: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setForm({ email: user.email, phone: user.phone || '', address: user.address || '' })
  }, [user])

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = await api.put('/api/auth/profile', form)
      showToast(result.message, 'success')
      onSaved(result.user)
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card fade-in" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 'var(--sp-4)' }}>Contact details</h3>

      <div className="form-group">
        <label htmlFor="profile-username">Username</label>
        <input id="profile-username" className="form-control" value={user.username} disabled />
        <span className="form-hint">Your username can't be changed.</span>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="profile-email">Email</label>
          <input
            id="profile-email"
            type="email"
            className="form-control"
            required
            value={form.email}
            onChange={setField('email')}
          />
        </div>

        <div className="form-group">
          <label htmlFor="profile-phone">Phone</label>
          <input
            id="profile-phone"
            type="tel"
            className="form-control"
            maxLength={15}
            placeholder="Your contact number"
            value={form.phone}
            onChange={setField('phone')}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="profile-address">Delivery address</label>
        <textarea
          id="profile-address"
          className="form-control"
          rows="3"
          placeholder="House / street, area, city, PIN code"
          value={form.address}
          onChange={setField('address')}
        />
        <span className="form-hint">Used to pre-fill checkout.</span>
      </div>

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? <span className="spinner" /> : <Icon name="save" size={16} />}
        Save changes
      </button>
    </form>
  )
}

/* ── Saved measurements ────────────────────────────────────── */

function MeasurementsTab({ user, refresh, showToast }) {
  const [values, setValues] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { setValues(user.measurements || {}) }, [user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = await api.put('/api/auth/measurements', { measurements: values })
      showToast(result.message, 'success')
      refresh()
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClear = async () => {
    setValues({})
    setSubmitting(true)
    try {
      const result = await api.put('/api/auth/measurements', { measurements: {} })
      showToast(result.message, 'info')
      refresh()
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card fade-in" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 'var(--sp-2)' }}>Saved measurements</h3>
      <p className="text-sm text-muted" style={{ marginBottom: 'var(--sp-4)' }}>
        Save your measurements once and every custom blouse order will pre-fill from
        here. All values are in inches.
      </p>

      <div className="measurement-grid">
        {MEASUREMENT_FIELDS.map(({ key, label }) => (
          <div className="form-group" key={key}>
            <label htmlFor={`profile-m-${key}`}>{label}</label>
            <input
              id={`profile-m-${key}`}
              type="text"
              inputMode="decimal"
              className="form-control"
              placeholder="e.g. 36"
              value={values[key] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: 'var(--sp-5)' }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? <span className="spinner" /> : <Icon name="save" size={16} />}
          Save measurements
        </button>
        <button type="button" className="btn btn-ghost" onClick={handleClear} disabled={submitting}>
          Clear all
        </button>
      </div>

      <div className="callout" style={{ marginTop: 'var(--sp-5)' }}>
        <Icon name="info" size={20} />
        <div>
          Not sure how to measure? The measuring guide is on every product page under
          "Measuring &amp; care".
        </div>
      </div>
    </form>
  )
}

/* ── Password ──────────────────────────────────────────────── */

function SecurityTab({ showToast }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [reveal, setReveal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const strength = passwordStrength(form.new_password)
  const mismatch = form.confirm_password && form.new_password !== form.confirm_password

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = await api.put('/api/auth/password', form)
      showToast(result.message, 'success')
      setForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card fade-in" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
      <h3 style={{ marginBottom: 'var(--sp-4)' }}>Change password</h3>

      <div className="form-group">
        <label htmlFor="current_password">Current password</label>
        <div className="password-field">
          <input
            id="current_password"
            type={reveal ? 'text' : 'password'}
            className="form-control"
            required
            value={form.current_password}
            onChange={setField('current_password')}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? 'Hide passwords' : 'Show passwords'}
          >
            <Icon name={reveal ? 'eyeOff' : 'eye'} size={17} />
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="new_password">New password</label>
        <input
          id="new_password"
          type={reveal ? 'text' : 'password'}
          className="form-control"
          required
          minLength={6}
          value={form.new_password}
          onChange={setField('new_password')}
        />
        {form.new_password && (
          <>
            <div className="strength-meter">
              {[1, 2, 3, 4].map((level) => (
                <span
                  key={level}
                  className={`strength-bar ${level <= strength.score ? `on-${strength.label}` : ''}`}
                />
              ))}
            </div>
            <span className="form-hint">Strength: {strength.label || 'too short'}</span>
          </>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="confirm_password">Confirm new password</label>
        <input
          id="confirm_password"
          type={reveal ? 'text' : 'password'}
          className={`form-control ${mismatch ? 'is-invalid' : ''}`}
          required
          value={form.confirm_password}
          onChange={setField('confirm_password')}
        />
        {mismatch && <span className="form-hint" style={{ color: 'var(--danger)' }}>Passwords don't match.</span>}
      </div>

      <button type="submit" className="btn btn-primary" disabled={submitting || mismatch}>
        {submitting ? <span className="spinner" /> : <Icon name="lock" size={16} />}
        Update password
      </button>
    </form>
  )
}
