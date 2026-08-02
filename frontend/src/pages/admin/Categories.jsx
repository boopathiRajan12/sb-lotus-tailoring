import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { useApi, usePageTitle } from '../../hooks/useApi'
import Icon from '../../components/Icon'
import { ConfirmDialog, EmptyState, TableSkeleton } from '../../components/ui'

export default function Categories() {
  usePageTitle('Admin Categories')
  const { showToast } = useToast()
  const { data, loading, error, reload } = useApi('/api/admin/categories')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const categories = data?.categories || []

  const handleDelete = async () => {
    setBusy(true)
    try {
      const result = await api.del(`/api/admin/categories/${deleteTarget.id}`)
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

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Categories</h2>
          <p>Group your products by the service you offer.</p>
        </div>
        <Link to="/admin/categories/add" className="btn btn-primary">
          <Icon name="plus" size={16} /> Add category
        </Link>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : error ? (
        <EmptyState icon="alertCircle" title="Couldn't load categories" description="Please refresh and try again." />
      ) : categories.length > 0 ? (
        <div className="table-wrap fade-in">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Description</th>
                <th className="num">Products</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td><strong>{cat.name}</strong></td>
                  <td>
                    <span className={`badge ${cat.category_type === 'stitching' ? 'badge-confirmed' : 'badge-neutral'}`}>
                      {cat.category_type}
                    </span>
                  </td>
                  <td className="text-muted">{cat.description || '-'}</td>
                  <td className="num">{cat.product_count}</td>
                  <td>
                    <div className="actions">
                      <Link to={`/admin/categories/edit/${cat.id}`} className="btn btn-outline btn-sm">
                        <Icon name="edit" size={14} /> Edit
                      </Link>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => setDeleteTarget(cat)}
                        disabled={cat.product_count > 0}
                        title={cat.product_count > 0 ? 'Move its products first' : 'Delete category'}
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
          icon="layers"
          title="No categories yet"
          description="Add your first category to start organising products."
          action={<Link to="/admin/categories/add" className="btn btn-primary">Add category</Link>}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete "${deleteTarget?.name}"?`}
        message="This removes the category permanently. Categories that still contain products can't be deleted."
        confirmLabel="Delete category"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
