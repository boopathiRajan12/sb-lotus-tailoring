import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { formatCurrency, formatDate } from '../../api/format'

export default function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/api/admin/dashboard').then(setStats)
  }, [])

  if (!stats) return null

  return (
    <>
      <h2 style={{ color: 'var(--primary)', marginBottom: 25 }}>Dashboard</h2>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-number">{stats.total_products}</div>
          <div className="stat-label">Total Products</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.total_categories}</div>
          <div className="stat-label">Categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.total_orders}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.pending_orders}</div>
          <div className="stat-label">Pending Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.total_users}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.new_users_month}</div>
          <div className="stat-label">New This Month</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 30, flexWrap: 'wrap' }}>
        <Link to="/admin/products/add" className="btn btn-primary">Add New Product</Link>
        <Link to="/admin/categories/add" className="btn btn-secondary">Add Category</Link>
        <Link to="/admin/orders" className="btn btn-outline">View All Orders</Link>
        <Link to="/admin/users" className="btn btn-outline">Manage Users</Link>
      </div>

      {stats.recent_orders.length > 0 && (
        <>
          <h3 style={{ marginBottom: 15 }}>Recent Orders</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_orders.map((order) => (
                <tr key={order.id}>
                  <td><Link to={`/admin/orders/${order.id}`}>#{order.id}</Link></td>
                  <td>{order.user.username}</td>
                  <td>{formatCurrency(order.total_amount)}</td>
                  <td><span className={`badge badge-${order.status}`}>{order.status[0].toUpperCase() + order.status.slice(1)}</span></td>
                  <td>{formatDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  )
}
