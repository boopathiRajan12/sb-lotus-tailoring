import { Link, NavLink, Outlet } from 'react-router-dom'
import Icon from '../../components/Icon'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: 'barChart', end: true },
  { to: '/admin/orders', label: 'Orders', icon: 'clipboard' },
  { to: '/admin/products', label: 'Products', icon: 'package' },
  { to: '/admin/categories', label: 'Categories', icon: 'layers' },
  { to: '/admin/users', label: 'Customers', icon: 'users' },
  { to: '/admin/reviews', label: 'Reviews', icon: 'message' },
]

export default function AdminLayout() {
  const linkClass = ({ isActive }) => (isActive ? 'active' : '')

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h3>Admin Menu</h3>

        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
            <Icon name={item.icon} size={17} />
            {item.label}
          </NavLink>
        ))}

        <div className="sidebar-foot">
          <Link to="/">
            <Icon name="home" size={17} />
            View shop
          </Link>
        </div>
      </aside>

      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  )
}
