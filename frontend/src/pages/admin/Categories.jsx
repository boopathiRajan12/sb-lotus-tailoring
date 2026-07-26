import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'

export default function Categories() {
  const { showToast } = useToast()
  const [categories, setCategories] = useState(null)

  const load = () => {
    api.get('/api/admin/categories').then((data) => setCategories(data.categories))
  }

  useEffect(load, [])

  const handleDelete = async (cat) => {
    if (!window.confirm('Delete this category?')) return
    try {
      const data = await api.del(`/api/admin/categories/${cat.id}`)
      showToast(data.message, 'success')
      load()
    } catch (err) {
      showToast(err.message, 'danger')
    }
  }

  if (!categories) return null

  return (
    <>
      <div className="page-header">
        <h2>Categories</h2>
        <Link to="/admin/categories/add" className="btn btn-primary">Add Category</Link>
      </div>

      {categories.length > 0 ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Description</th>
              <th>Products</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td>{cat.id}</td>
                <td><strong>{cat.name}</strong></td>
                <td><span className="badge badge-confirmed">{cat.category_type}</span></td>
                <td>{cat.description || '-'}</td>
                <td>{cat.product_count}</td>
                <td className="actions">
                  <Link to={`/admin/categories/edit/${cat.id}`} className="btn btn-sm btn-outline">Edit</Link>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(cat)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <h3>No categories yet</h3>
          <p>Add your first category to start organizing products.</p>
        </div>
      )}
    </>
  )
}
