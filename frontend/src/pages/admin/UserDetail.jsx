import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { formatCurrency, formatDate } from '../../api/format'

export default function UserDetail() {
  const { userId } = useParams()
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get(`/api/admin/users/${userId}`).then(setData)
  }, [userId])

  if (!data) return null
  const { user, orders, total_spent } = data

  return (
    <>
      <div className="page-header">
        <h2>User Details</h2>
        <Link to="/admin/users" className="btn btn-outline btn-sm">Back to Users</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 25 }}>
        <div style={{ background: 'var(--bg-white)', padding: 25, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20 }}>
            <span className="profile-avatar-large">{user.username[0].toUpperCase()}</span>
            <div>
              <h3 style={{ margin: 0 }}>{user.username}</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Member since {formatDate(user.created_at)}</p>
            </div>
          </div>
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
        </div>

        <div style={{ background: 'var(--bg-white)', padding: 25, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ marginBottom: 20, color: 'var(--primary)' }}>Order Summary</h3>
          <div className="stat-cards" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="stat-card">
              <div className="stat-number">{orders.length}</div>
              <div className="stat-label">Total Orders</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{formatCurrency(total_spent, 0)}</div>
              <div className="stat-label">Total Spent</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 25 }}>
        <h3 style={{ marginBottom: 15, color: 'var(--primary)' }}>Order History</h3>
        {orders.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{formatDate(order.created_at, true)}</td>
                  <td>{order.items.length}</td>
                  <td>{formatCurrency(order.total_amount)}</td>
                  <td><span className={`badge badge-${order.status}`}>{order.status[0].toUpperCase() + order.status.slice(1)}</span></td>
                  <td><Link to={`/admin/orders/${order.id}`} className="btn btn-outline btn-sm">View Order</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <h3>No Orders</h3>
            <p>This user hasn't placed any orders yet.</p>
          </div>
        )}
      </div>
    </>
  )
}
