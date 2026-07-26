import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatCurrency, formatDate } from '../api/format'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const [orders, setOrders] = useState([])
  const [totalSpent, setTotalSpent] = useState(0)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ email: '', phone: '', address: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/api/auth/profile').then((data) => {
      setOrders(data.orders)
      setTotalSpent(data.total_spent)
    })
  }, [])

  useEffect(() => {
    if (user) setForm({ email: user.email, phone: user.phone || '', address: user.address || '' })
  }, [user])

  if (!user) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const data = await api.put('/api/auth/profile', form)
      showToast(data.message, 'success')
      updateUser(data.user)
      setEditing(false)
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <h2 className="section-title">My Profile</h2>

      <div className="profile-layout">
        <div className="profile-card">
          <div className="profile-avatar-large">{user.username[0].toUpperCase()}</div>
          <h3 style={{ marginBottom: 5 }}>{user.username}</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Member since {formatDate(user.created_at)}</p>

          {!editing ? (
            <>
              <div className="profile-info-grid">
                <div className="profile-info-item">
                  <span className="profile-label">Email</span>
                  <span className="profile-value">{user.email}</span>
                </div>
                <div className="profile-info-item">
                  <span className="profile-label">Phone</span>
                  <span className="profile-value">{user.phone || 'Not set'}</span>
                </div>
                <div className="profile-info-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="profile-label">Address</span>
                  <span className="profile-value">{user.address || 'Not set'}</span>
                </div>
              </div>
              <button type="button" className="btn btn-outline" style={{ marginTop: 15 }} onClick={() => setEditing(true)}>Edit Profile</button>
            </>
          ) : (
            <form onSubmit={handleSubmit} style={{ marginTop: 20, textAlign: 'left' }}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" className="form-control" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input type="text" id="phone" className="form-control" placeholder="Enter phone number" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="address">Address</label>
                <textarea id="address" className="form-control" placeholder="Enter address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>Save Changes</button>
                <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>

        <div className="profile-orders">
          <div className="profile-stats">
            <div className="stat-card">
              <div className="stat-number">{orders.length}</div>
              <div className="stat-label">Total Orders</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{formatCurrency(totalSpent, 0)}</div>
              <div className="stat-label">Total Spent</div>
            </div>
          </div>

          <h3 style={{ margin: '25px 0 15px', color: 'var(--primary)' }}>Recent Orders</h3>
          {orders.length > 0 ? (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{formatDate(order.created_at)}</td>
                      <td>{order.items.length}</td>
                      <td>{formatCurrency(order.total_amount)}</td>
                      <td><span className={`badge badge-${order.status}`}>{order.status[0].toUpperCase() + order.status.slice(1)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length > 5 && (
                <Link to="/my-orders" className="btn btn-outline btn-sm" style={{ marginTop: 15 }}>View All Orders</Link>
              )}
            </>
          ) : (
            <div className="empty-state">
              <h3>No orders yet</h3>
              <p>Start shopping to see your orders here.</p>
              <Link to="/products" className="btn btn-primary" style={{ marginTop: 15 }}>Browse Products</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
