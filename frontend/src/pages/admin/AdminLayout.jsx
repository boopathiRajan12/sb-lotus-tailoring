import { Link, NavLink, Outlet } from 'react-router-dom'

export default function AdminLayout() {
  const linkClass = ({ isActive }) => (isActive ? 'active' : '')

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h3>Admin Menu</h3>
        <NavLink to="/admin" end className={linkClass}>Dashboard</NavLink>
        <NavLink to="/admin/categories" className={linkClass}>Categories</NavLink>
        <NavLink to="/admin/products" className={linkClass}>Products</NavLink>
        <NavLink to="/admin/orders" className={linkClass}>Orders</NavLink>
        <NavLink to="/admin/users" className={linkClass}>Users</NavLink>
        <Link to="/">View Shop</Link>
      </aside>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  )
}
