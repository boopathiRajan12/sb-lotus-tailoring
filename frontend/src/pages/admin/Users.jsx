import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { formatCurrency, formatDate } from '../../api/format'

export default function Users() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/api/admin/users').then(setData)
  }, [])

  if (!data) return null

  return (
    <>
      <div className="page-header">
        <h2>User Management</h2>
      </div>

      <div className="stat-cards" style={{ marginBottom: 30 }}>
        <div className="stat-card">
          <div className="stat-number">{data.total_users}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{data.new_users_month}</div>
          <div className="stat-label">New This Month</div>
        </div>
      </div>

      {data.user_stats.length > 0 ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Username</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Registered</th>
              <th>Orders</th>
              <th>Total Spent</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.user_stats.map((us, idx) => (
              <tr key={us.user.id}>
                <td>{idx + 1}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="table-avatar">{us.user.username[0].toUpperCase()}</span>
                    <strong>{us.user.username}</strong>
                  </div>
                </td>
                <td>{us.user.email}</td>
                <td>{us.user.phone || '-'}</td>
                <td>{formatDate(us.user.created_at)}</td>
                <td>{us.total_orders}</td>
                <td>{formatCurrency(us.total_spent)}</td>
                <td><Link to={`/admin/users/${us.user.id}`} className="btn btn-outline btn-sm">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <h3>No Users Yet</h3>
          <p>Users will appear here once they register on the shop.</p>
        </div>
      )}
    </>
  )
}
