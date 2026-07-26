import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { formatCurrency, formatDate } from '../api/format'

export default function MyOrders() {
  const [orders, setOrders] = useState(null)

  useEffect(() => {
    api.get('/api/orders').then((data) => setOrders(data.orders))
  }, [])

  if (!orders) return null

  return (
    <div className="container" style={{ padding: '30px 0' }}>
      <h2 className="section-title">My Orders</h2>

      {orders.length > 0 ? (
        <table className="cart-table">
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
            {orders.map((order) => (
              <tr key={order.id}>
                <td><strong>#{order.id}</strong></td>
                <td>{formatDate(order.created_at)}</td>
                <td>{order.items.map((item) => `${item.product_name} (x${item.quantity})`).join(', ')}</td>
                <td>{formatCurrency(order.total_amount)}</td>
                <td><span className={`badge badge-${order.status}`}>{order.status[0].toUpperCase() + order.status.slice(1)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <h3>No orders yet</h3>
          <p>You have not placed any orders.</p>
          <Link to="/products" className="btn btn-primary" style={{ marginTop: 15 }}>Browse Products</Link>
        </div>
      )}
    </div>
  )
}
