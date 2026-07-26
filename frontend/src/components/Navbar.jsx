import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    setOpen(false)
    showToast('You have been logged out.', 'info')
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="navbar-brand" onClick={() => setOpen(false)}>
          <span>SB</span> LOTUS TAILORING SHOP
        </Link>
        <button className="nav-toggle" aria-label="Toggle navigation" onClick={() => setOpen((o) => !o)}>
          &#9776;
        </button>
        <ul className={`nav-links ${open ? 'open' : ''}`}>
          <li><Link to="/" onClick={() => setOpen(false)}>Home</Link></li>
          <li><Link to="/products" onClick={() => setOpen(false)}>Products</Link></li>
          <li><Link to="/custom-blouse" onClick={() => setOpen(false)}>Custom Blouse</Link></li>
          <li><Link to="/about" onClick={() => setOpen(false)}>About</Link></li>
          {user ? (
            <>
              {user.is_admin ? (
                <li><Link to="/admin" onClick={() => setOpen(false)}>Admin Panel</Link></li>
              ) : (
                <>
                  <li>
                    <Link to="/cart" onClick={() => setOpen(false)}>
                      Cart
                      {user.cart_count > 0 && <span className="nav-cart-badge">{user.cart_count}</span>}
                    </Link>
                  </li>
                  <li><Link to="/my-orders" onClick={() => setOpen(false)}>My Orders</Link></li>
                </>
              )}
              <li>
                <Link to="/profile" className="nav-profile-link" title="My Profile" onClick={() => setOpen(false)}>
                  <span className="nav-avatar">{user.username[0].toUpperCase()}</span>
                </Link>
              </li>
              <li><a href="#logout" onClick={(e) => { e.preventDefault(); handleLogout() }}>Logout</a></li>
            </>
          ) : (
            <>
              <li><Link to="/login" onClick={() => setOpen(false)}>Login</Link></li>
              <li><Link to="/register" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>Register</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  )
}
