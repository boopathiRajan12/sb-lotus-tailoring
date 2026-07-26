import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'

const initialForm = { name: '', description: '', price: '', stock: '0', category_id: '', is_custom_blouse: false, is_active: true }

export default function ProductForm() {
  const { productId } = useParams()
  const isEdit = Boolean(productId)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(initialForm)
  const [existingImages, setExistingImages] = useState([])
  const [newFiles, setNewFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/api/admin/categories').then((data) => setCategories(data.categories))
  }, [])

  useEffect(() => {
    if (isEdit) {
      api.get(`/api/admin/products/${productId}`).then(({ product }) => {
        setForm({
          name: product.name,
          description: product.description || '',
          price: product.price,
          stock: product.stock,
          category_id: product.category_id,
          is_custom_blouse: product.is_custom_blouse,
          is_active: product.is_active,
        })
        setExistingImages(product.images)
      })
    }
  }, [productId, isEdit])

  useEffect(() => {
    const urls = newFiles.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [newFiles])

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setChecked = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    const formData = new FormData()
    formData.append('name', form.name)
    formData.append('description', form.description)
    formData.append('price', form.price)
    formData.append('stock', form.stock)
    formData.append('category_id', form.category_id)
    if (form.is_custom_blouse) formData.append('is_custom_blouse', 'on')
    if (isEdit && form.is_active) formData.append('is_active', 'on')
    newFiles.forEach((file) => formData.append('images', file))

    try {
      const data = isEdit
        ? await api.put(`/api/admin/products/${productId}`, formData, { isFormData: true })
        : await api.post('/api/admin/products', formData, { isFormData: true })
      showToast(data.message, 'success')
      navigate('/admin/products')
    } catch (err) {
      showToast(err.message, 'danger')
      setSubmitting(false)
    }
  }

  const handleDeleteExistingImage = async (imageId) => {
    try {
      await api.del(`/api/admin/products/images/${imageId}`)
      setExistingImages((imgs) => imgs.filter((img) => img.id !== imageId))
    } catch (err) {
      showToast(err.message, 'danger')
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>{isEdit ? 'Edit' : 'Add New'} Product</h2>
        <Link to="/admin/products" className="btn btn-outline btn-sm">Back to Products</Link>
      </div>

      <div style={{ maxWidth: 700, background: 'var(--bg-white)', padding: 30, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Product Name *</label>
            <input type="text" id="name" className="form-control" required placeholder="e.g., Silk Blouse Design A" value={form.name} onChange={setField('name')} />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea id="description" className="form-control" rows="3" placeholder="Describe the product..." value={form.description} onChange={setField('description')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            <div className="form-group">
              <label htmlFor="price">Price (Rs.) *</label>
              <input type="number" id="price" className="form-control" step="0.01" min="0" required placeholder="e.g., 500" value={form.price} onChange={setField('price')} />
            </div>
            <div className="form-group">
              <label htmlFor="stock">Stock Quantity</label>
              <input type="number" id="stock" className="form-control" min="0" placeholder="0 = made to order" value={form.stock} onChange={setField('stock')} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="category_id">Category *</label>
            <select id="category_id" className="form-control" required value={form.category_id} onChange={setField('category_id')}>
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name} ({cat.category_type})</option>
              ))}
            </select>
          </div>

          <div className="form-check">
            <input type="checkbox" id="is_custom_blouse" checked={form.is_custom_blouse} onChange={setChecked('is_custom_blouse')} />
            <label htmlFor="is_custom_blouse">This is a custom blouse design (will appear in Custom Blouse section)</label>
          </div>

          {isEdit && (
            <div className="form-check">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={setChecked('is_active')} />
              <label htmlFor="is_active">Product is active (visible to customers)</label>
            </div>
          )}

          <div className="form-group" style={{ marginTop: 20 }}>
            <label>Product Images (you can select multiple)</label>
            <div className="image-upload-area" onClick={() => document.getElementById('image-upload').click()}>
              <p>Click to upload images</p>
              <small>Supported: PNG, JPG, JPEG, GIF, WebP (max 16MB each)</small>
            </div>
            <input
              type="file" id="image-upload" multiple accept="image/*" style={{ display: 'none' }}
              onChange={(e) => setNewFiles(Array.from(e.target.files))}
            />
            {previews.length > 0 && (
              <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                {previews.map((src, i) => (
                  <img key={i} src={src} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6 }} />
                ))}
              </div>
            )}
          </div>

          {isEdit && existingImages.length > 0 && (
            <div className="form-group">
              <label>Current Images</label>
              <div className="existing-images">
                {existingImages.map((img) => (
                  <div className="existing-image" key={img.id}>
                    <img src={img.url} alt="Product" />
                    <button type="button" className="delete-img-btn" title="Delete this image" onClick={() => handleDeleteExistingImage(img.id)}>&times;</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: 20 }} disabled={submitting}>
            {isEdit ? 'Update' : 'Add'} Product
          </button>
        </form>
      </div>
    </>
  )
}
