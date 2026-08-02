import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { useApi, usePageTitle } from '../../hooks/useApi'
import Icon from '../../components/Icon'
import { Skeleton } from '../../components/ui'

const initialForm = { name: '', description: '', category_type: 'stitching' }

export default function CategoryForm() {
  const { categoryId } = useParams()
  const isEdit = Boolean(categoryId)
  const navigate = useNavigate()
  const { showToast } = useToast()
  usePageTitle(isEdit ? 'Edit category' : 'Add category')

  const { data, loading } = useApi(
    isEdit ? `/api/admin/categories/${categoryId}` : null,
    { skip: !isEdit },
  )

  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!data?.category) return
    setForm({
      name: data.category.name,
      description: data.category.description || '',
      category_type: data.category.category_type,
    })
  }, [data])

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = isEdit
        ? await api.put(`/api/admin/categories/${categoryId}`, form)
        : await api.post('/api/admin/categories', form)
      showToast(result.message, 'success')
      navigate('/admin/categories')
    } catch (err) {
      showToast(err.message, 'danger')
      setSubmitting(false)
    }
  }

  if (isEdit && loading) {
    return <Skeleton height={380} radius="var(--radius)" style={{ maxWidth: 600 }} />
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{isEdit ? 'Edit' : 'Add new'} category</h2>
          <p>Categories organise the shop and appear as service tiles on the home page.</p>
        </div>
        <Link to="/admin/categories" className="btn btn-ghost btn-sm">
          <Icon name="chevronLeft" size={15} /> Back to categories
        </Link>
      </div>

      <form className="card" style={{ maxWidth: 600 }} onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Category name *</label>
          <input
            id="name"
            type="text"
            className="form-control"
            required
            placeholder="e.g. Blouse, Sudithar, School Uniform"
            value={form.name}
            onChange={setField('name')}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            className="form-control"
            rows="3"
            placeholder="A short line shown under the category name"
            value={form.description}
            onChange={setField('description')}
          />
        </div>

        <div className="form-group">
          <label htmlFor="category_type">Type</label>
          <select
            id="category_type"
            className="form-control"
            value={form.category_type}
            onChange={setField('category_type')}
          >
            <option value="stitching">Stitching service</option>
            <option value="readymade">Ready-made product</option>
          </select>
        </div>

        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? <span className="spinner" /> : <Icon name="save" size={16} />}
            {isEdit ? 'Save changes' : 'Add category'}
          </button>
          <Link to="/admin/categories" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </>
  )
}
