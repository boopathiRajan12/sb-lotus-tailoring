import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { formatCurrency } from '../../api/format'
import { productImageUrl } from '../../components/ProductCard'

export default function Products() {
  const { showToast } = useToast()
  const [products, setProducts] = useState(null)

  const load = () => {
    api.get('/api/admin/products').then((data) => setProducts(data.products))
  }

  useEffect(load, [])

  const handleDelete = async (product) => {
    if (!window.confirm('Delete this product and all its images?')) return
    try {
      const data = await api.del(`/api/admin/products/${product.id}`)
      showToast(data.message, 'success')
      load()
    } catch (err) {
      showToast(err.message, 'danger')
    }
  }

  if (!products) return null

  return (
    <>
      <div className="page-header">
        <h2>Products</h2>
        <Link to="/admin/products/add" className="btn btn-primary">Add Product</Link>
      </div>

      {products.length > 0 ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Custom Blouse</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td><img src={productImageUrl(product)} alt={product.name} /></td>
                <td><strong>{product.name}</strong></td>
                <td>{product.category?.name}</td>
                <td>{formatCurrency(product.price)}</td>
                <td>{product.stock}</td>
                <td>{product.is_custom_blouse ? 'Yes' : 'No'}</td>
                <td>{product.is_active ? 'Yes' : 'No'}</td>
                <td className="actions">
                  <Link to={`/admin/products/edit/${product.id}`} className="btn btn-sm btn-outline">Edit</Link>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(product)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <h3>No products yet</h3>
          <p>Add your first product to get started.</p>
        </div>
      )}
    </>
  )
}
