import { useCallback, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'
import { useOnClickOutside } from '../hooks/useApi'
import { initials } from '../api/format'
import Icon from './Icon'

const PUBLIC_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Products' },
  { to: '/custom-blouse', label: 'Custom Blouse' },
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useOnClickOutside(userMenuRef, useCallback(() => setUserMenuOpen(false), []), userMenuOpen)

  const closeAll = () => { setMenuOpen(false); setUserMenuOpen(false) }

  const handleLogout = async () => {
    await logout()
    closeAll()
    showToast('You have been logged out.', 'info')
    navigate('/')
  }

  const linkClass = ({ isActive }) => (isActive ? 'active' : '')

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="navbar-brand" onClick={closeAll}>
          <img src="/logo.png" alt="SB Lotus Logo" className="brand-logo" />
          <span className="brand-text">
            LOTUS
            <small>TAILORING SHOP</small>
          </span>
        </Link>

        <button
          className="nav-toggle"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'x' : 'menu'} size={24} />
        </button>

        <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {PUBLIC_LINKS.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.end} className={linkClass} onClick={closeAll}>
                {link.label}
              </NavLink>
            </li>
          ))}

          {user && !user.is_admin && (
            <>
              <li>
                <NavLink to="/wishlist" className={`${linkClass} nav-icon-link`} onClick={closeAll} title="Wishlist">
                  <Icon name="heart" size={20} />
                  <span className="sr-only">Wishlist</span>
                  {user.wishlist_count > 0 && <span className="nav-badge">{user.wishlist_count}</span>}
                </NavLink>
              </li>
              <li>
                <NavLink to="/cart" className={`${linkClass} nav-icon-link`} onClick={closeAll} title="Cart">
                  <Icon name="cart" size={20} />
                  <span className="sr-only">Cart</span>
                  {user.cart_count > 0 && <span className="nav-badge">{user.cart_count}</span>}
                </NavLink>
              </li>
            </>
          )}

          {user && user.is_admin && (
            <li>
              <NavLink to="/admin" className={linkClass} onClick={closeAll}>Admin Panel</NavLink>
            </li>
          )}

          <li>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
          </li>

          {user ? (
            <li className="nav-user" ref={userMenuRef}>
              <button
                className="nav-user-trigger"
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
              >
                <span className="nav-avatar">{initials(user.username)}</span>
                {user.username}
                <Icon name="chevronDown" size={14} />
              </button>

              {userMenuOpen && (
                <div className="dropdown" role="menu">
                  <div className="dropdown-header">
                    <strong>{user.username}</strong>
                    <span>{user.email}</span>
                  </div>

                  <Link to="/profile" onClick={closeAll} role="menuitem">
                    <Icon name="user" /> My Profile
                  </Link>

                  {!user.is_admin && (
                    <>
                      <Link to="/my-orders" onClick={closeAll} role="menuitem">
                        <Icon name="package" /> My Orders
                      </Link>
                      <Link to="/wishlist" onClick={closeAll} role="menuitem">
                        <Icon name="heart" /> Wishlist
                      </Link>
                      <Link to="/cart" onClick={closeAll} role="menuitem">
                        <Icon name="cart" /> Cart
                      </Link>
                    </>
                  )}

                  {user.is_admin && (
                    <Link to="/admin" onClick={closeAll} role="menuitem">
                      <Icon name="barChart" /> Admin Dashboard
                    </Link>
                  )}

                  <div className="dropdown-divider" />
                  <button className="danger-item" onClick={handleLogout} role="menuitem">
                    <Icon name="logout" /> Log out
                  </button>
                </div>
              )}
            </li>
          ) : (
            <>
              <li><NavLink to="/login" className={linkClass} onClick={closeAll}>Login</NavLink></li>
              <li>
                <Link to="/register" className="btn btn-secondary btn-sm" onClick={closeAll}>
                  Register
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  )
}
