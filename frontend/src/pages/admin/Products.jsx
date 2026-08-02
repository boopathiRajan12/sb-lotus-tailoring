import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { useApi, useDebounced, usePageTitle } from '../../hooks/useApi'
import { formatCurrency } from '../../api/format'
import { productImageUrl, onImageError } from '../../components/ProductCard'
import Icon from '../../components/Icon'
import { ConfirmDialog, EmptyState, Stars, TableSkeleton } from '../../components/ui'

const FILTERS = [
  { value: '', label: 'All products' },
  { value: 'active', label: 'Visible' },
  { value: 'inactive', label: 'Hidden' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'custom', label: 'Custom blouse' },
]

export default function Products() {
  usePageTitle('Admin Products')
  const { showToast } = useToast()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const debouncedSearch = useDebounced(search, 400)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
    if (status) params.set('status', status)
    return params.toString()
  }, [debouncedSearch, status])

  const { data, loading, error, reload } = useApi(`/api/admin/products?${query}`)
  const products = data?.products || []

  const handleDelete = async () => {
    setBusy(true)
    try {
      const result = await api.del(`/api/admin/products/${deleteTarget.id}`)
      showToast(result.message, 'success')
      setDeleteTarget(null)
      reload()
    } catch (err) {
      showToast(err.message, 'danger')
      setDeleteTarget(null)
    } finally {
      setBusy(false)
    }
  }

  const handleToggle = async (product) => {
    try {
      const result = await api.put(`/api/admin/products/${product.id}/toggle`)
      showToast(result.message, 'success')
      reload()
    } catch (err) {
      showToast(err.message, 'danger')
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Products</h2>
          <p>{loading ? 'Loading...' : `${data.total} product${data.total === 1 ? '' : 's'}`}</p>
        </div>
        <Link to="/admin/products/add" className="btn btn-primary">
          <Icon name="plus" size={16} /> Add product
        </Link>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <div className="input-group">
            <span className="input-group-icon"><Icon name="search" size={17} /></span>
            <input
              type="search"
              className="form-control"
              placeholder="Search products by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search products"
            />
          </div>
        </div>

        <select
          className="form-control"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter products"
        >
          {FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>{filter.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : error ? (
        <EmptyState icon="alertCircle" title="Couldn't load products" description="Please refresh and try again." />
      ) : products.length > 0 ? (
        <div className="table-wrap fade-in">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th className="num">Price</th>
                <th className="num">Stock</th>
                <th>Rating</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                      <img
                        className="thumb"
                        src={productImageUrl(product)}
                        alt=""
                        onError={onImageError}
                      />
                      <div style={{ minWidth: 0 }}>
                        <strong>{product.name}</strong>
                        <div className="row" style={{ gap: 4, marginTop: 3 }}>
                          {product.is_custom_blouse && (
                            <span className="badge badge-custom">Custom</span>
                          )}
                          {product.is_featured && (
                            <span className="badge badge-confirmed">Featured</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{product.category?.name || '-'}</td>
                  <td className="num">
                    {formatCurrency(product.price)}
                    {product.discount_percent > 0 && (
                      <div className="text-xs" style={{ color: 'var(--success)' }}>
                        -{product.discount_percent}%
                      </div>
                    )}
                  </td>
                  <td className="num">
                    {product.is_made_to_order ? (
                      <span className="text-muted text-xs">Made to order</span>
                    ) : (
                      <span style={{ color: product.stock <= 5 ? 'var(--warning)' : undefined }}>
                        {product.stock}
                      </span>
                    )}
                  </td>
                  <td>
                    {product.rating_count > 0
                      ? <Stars value={product.rating_avg} count={product.rating_count} />
                      : <span className="text-muted text-xs">-</span>}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`badge ${product.is_active ? 'badge-ready' : 'badge-neutral'}`}
                      style={{ border: 'none', cursor: 'pointer' }}
                      onClick={() => handleToggle(product)}
                      title="Click to toggle visibility"
                    >
                      <Icon name={product.is_active ? 'eye' : 'eyeOff'} size={12} />
                      {product.is_active ? 'Visible' : 'Hidden'}
                    </button>
                  </td>
                  <td>
                    <div className="actions">
                      <Link to={`/admin/products/edit/${product.id}`} className="btn btn-outline btn-sm">
                        <Icon name="edit" size={14} /> Edit
                      </Link>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => setDeleteTarget(product)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="package"
          title={query ? 'No products match those filters' : 'No products yet'}
          description={
            query
              ? 'Try a different search term or filter.'
              : 'Add your first product to start selling.'
          }
          action={<Link to="/admin/products/add" className="btn btn-primary">Add product</Link>}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete "${deleteTarget?.name}"?`}
        message="This permanently removes the product and all its images. Products that appear in past orders can't be deleted - hide them instead."
        confirmLabel="Delete product"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
