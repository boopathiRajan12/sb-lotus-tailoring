import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'

const initialForm = { name: '', description: '', category_type: 'stitching' }

export default function CategoryForm() {
  const { categoryId } = useParams()
  const isEdit = Boolean(categoryId)
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isEdit) {
      api.get('/api/admin/categories').then((data) => {
        const cat = data.categories.find((c) => String(c.id) === categoryId)
        if (cat) setForm({ name: cat.name, description: cat.description || '', category_type: cat.category_type })
      })
    }
  }, [categoryId, isEdit])

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const data = isEdit
        ? await api.put(`/api/admin/categories/${categoryId}`, form)
        : await api.post('/api/admin/categories', form)
      showToast(data.message, 'success')
      navigate('/admin/categories')
    } catch (err) {
      showToast(err.message, 'danger')
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>{isEdit ? 'Edit' : 'Add New'} Category</h2>
        <Link to="/admin/categories" className="btn btn-outline btn-sm">Back to Categories</Link>
      </div>

      <div style={{ maxWidth: 600, background: 'var(--bg-white)', padding: 30, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Category Name *</label>
            <input type="text" id="name" className="form-control" required placeholder="e.g., Blouse, Sudithar, School Uniform" value={form.name} onChange={setField('name')} />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea id="description" className="form-control" rows="3" placeholder="Brief description of this category" value={form.description} onChange={setField('description')} />
          </div>
          <div className="form-group">
            <label htmlFor="category_type">Type</label>
            <select id="category_type" className="form-control" value={form.category_type} onChange={setField('category_type')}>
              <option value="stitching">Stitching Service</option>
              <option value="readymade">Ready-made Product</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>{isEdit ? 'Update' : 'Add'} Category</button>
        </form>
      </div>
    </>
  )
}
