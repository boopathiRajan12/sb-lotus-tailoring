import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatCurrency } from '../api/format'
import { productImageUrl } from '../components/ProductCard'

export default function Cart() {
  const { refresh } = useAuth()
  const { showToast } = useToast()
  const [cartItems, setCartItems] = useState(null)
  const [total, setTotal] = useState(0)
  const [quantities, setQuantities] = useState({})

  const load = () => {
    api.get('/api/cart').then((data) => {
      setCartItems(data.cart_items)
      setTotal(data.total)
      setQuantities(Object.fromEntries(data.cart_items.map((i) => [i.id, i.quantity])))
    })
  }

  useEffect(load, [])

  const handleUpdate = async (itemId) => {
    try {
      const data = await api.put(`/api/cart/items/${itemId}`, { quantity: Number(quantities[itemId]) || 1 })
      showToast(data.message, 'success')
      load()
      refresh()
    } catch (err) {
      showToast(err.message, 'danger')
    }
  }

  const handleRemove = async (itemId) => {
    try {
      const data = await api.del(`/api/cart/items/${itemId}`)
      showToast(data.message, 'info')
      load()
      refresh()
    } catch (err) {
      showToast(err.message, 'danger')
    }
  }

  if (!cartItems) return null

  return (
    <div className="container" style={{ padding: '30px 0' }}>
      <h2 className="section-title">Your Shopping Cart</h2>

      {cartItems.length > 0 ? (
        <>
          <table className="cart-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Name</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Subtotal</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <img src={productImageUrl(item.product)} alt={item.product.name} className="cart-item-img" />
                  </td>
                  <td>
                    <Link to={`/products/${item.product.id}`}>{item.product.name}</Link>
                    {item.measurements && <><br /><small style={{ color: 'var(--text-muted)' }}>Measurements provided</small></>}
                  </td>
                  <td>{formatCurrency(item.product.price)}</td>
                  <td>
                    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                      <input
                        type="number" min="1" max="10" className="cart-qty-input"
                        value={quantities[item.id] ?? item.quantity}
                        onChange={(e) => setQuantities((q) => ({ ...q, [item.id]: e.target.value }))}
                      />
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => handleUpdate(item.id)}>Update</button>
                    </span>
                  </td>
                  <td><strong>{formatCurrency(item.subtotal)}</strong></td>
                  <td>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemove(item.id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="cart-summary">
            <p className="total-price">Total: {formatCurrency(total)}</p>
            <div style={{ marginTop: 15, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Link to="/products" className="btn btn-outline">Continue Shopping</Link>
              <Link to="/checkout" className="btn btn-primary btn-lg">Proceed to Checkout</Link>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <h3>Your cart is empty</h3>
          <p>Start adding products to your cart.</p>
          <Link to="/products" className="btn btn-primary" style={{ marginTop: 15 }}>Browse Products</Link>
        </div>
      )}
    </div>
  )
}
