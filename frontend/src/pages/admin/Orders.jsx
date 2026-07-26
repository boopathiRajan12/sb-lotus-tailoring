import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { formatCurrency, formatDate } from '../../api/format'

export default function Orders() {
  const [orders, setOrders] = useState(null)

  useEffect(() => {
    api.get('/api/admin/orders').then((data) => setOrders(data.orders))
  }, [])

  if (!orders) return null

  return (
    <>
      <div className="page-header">
        <h2>Orders</h2>
      </div>

      {orders.length > 0 ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td><strong>#{order.id}</strong></td>
                <td>{order.user.username}</td>
                <td>{order.phone || '-'}</td>
                <td>{order.items.length}</td>
                <td>{formatCurrency(order.total_amount)}</td>
                <td><span className={`badge badge-${order.status}`}>{order.status[0].toUpperCase() + order.status.slice(1)}</span></td>
                <td>{formatDate(order.created_at)}</td>
                <td><Link to={`/admin/orders/${order.id}`} className="btn btn-sm btn-outline">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <h3>No orders yet</h3>
          <p>Orders will appear here when customers place them.</p>
        </div>
      )}
    </>
  )
}
