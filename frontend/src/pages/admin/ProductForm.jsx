import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { useApi, usePageTitle } from '../../hooks/useApi'
import { formatCurrency } from '../../api/format'
import Icon from '../../components/Icon'
import { ConfirmDialog, Skeleton } from '../../components/ui'

const initialForm = {
  name: '',
  description: '',
  price: '',
  compare_at_price: '',
  stock: '0',
  category_id: '',
  is_custom_blouse: false,
  is_featured: false,
  is_active: true,
}

export default function ProductForm() {
  const { productId } = useParams()
  const isEdit = Boolean(productId)
  const navigate = useNavigate()
  const { showToast } = useToast()
  usePageTitle(isEdit ? 'Edit product' : 'Add product')

  const { data: categoryData } = useApi('/api/admin/categories')
  const { data: productData, loading } = useApi(
    isEdit ? `/api/admin/products/${productId}` : null,
    { skip: !isEdit },
  )

  const [form, setForm] = useState(initialForm)
  const [existingImages, setExistingImages] = useState([])
  const [newFiles, setNewFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [imageToDelete, setImageToDelete] = useState(null)
  const fileInputRef = useRef(null)

  const categories = categoryData?.categories || []

  useEffect(() => {
    if (!productData?.product) return
    const product = productData.product
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      compare_at_price: product.compare_at_price ?? '',
      stock: product.stock,
      category_id: product.category_id,
      is_custom_blouse: product.is_custom_blouse,
      is_featured: product.is_featured,
      is_active: product.is_active,
    })
    setExistingImages(product.images || [])
  }, [productData])

  // Object URLs must be revoked or the blobs leak as the selection changes.
  useEffect(() => {
    const urls = newFiles.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [newFiles])

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setChecked = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }))

  const addFiles = (fileList) => {
    const images = Array.from(fileList).filter((file) => file.type.startsWith('image/'))
    if (images.length !== fileList.length) {
      showToast('Only image files can be uploaded.', 'warning')
    }
    setNewFiles((current) => [...current, ...images])
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragging(false)
    addFiles(event.dataTransfer.files)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)

    const formData = new FormData()
    formData.append('name', form.name)
    formData.append('description', form.description)
    formData.append('price', form.price)
    formData.append('stock', form.stock)
    formData.append('category_id', form.category_id)
    if (form.compare_at_price !== '') formData.append('compare_at_price', form.compare_at_price)
    if (form.is_custom_blouse) formData.append('is_custom_blouse', 'on')
    if (form.is_featured) formData.append('is_featured', 'on')
    if (isEdit && form.is_active) formData.append('is_active', 'on')
    newFiles.forEach((file) => formData.append('images', file))

    try {
      const result = isEdit
        ? await api.put(`/api/admin/products/${productId}`, formData, { isFormData: true })
        : await api.post('/api/admin/products', formData, { isFormData: true })
      showToast(result.message, 'success')
      navigate('/admin/products')
    } catch (err) {
      showToast(err.message, 'danger')
      setSubmitting(false)
    }
  }

  const handleDeleteImage = async () => {
    try {
      await api.del(`/api/admin/products/images/${imageToDelete}`)
      setExistingImages((imgs) => imgs.filter((img) => img.id !== imageToDelete))
      showToast('Image deleted.', 'info')
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setImageToDelete(null)
    }
  }

  if (isEdit && loading) {
    return (
      <>
        <Skeleton height={36} width={220} style={{ marginBottom: 24 }} />
        <Skeleton height={520} radius="var(--radius)" style={{ maxWidth: 760 }} />
      </>
    )
  }

  const discount = form.compare_at_price && Number(form.compare_at_price) > Number(form.price)
    ? Math.round((Number(form.compare_at_price) - Number(form.price)) / Number(form.compare_at_price) * 100)
    : 0

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{isEdit ? 'Edit' : 'Add new'} product</h2>
          <p>{isEdit ? 'Update the details customers see in the shop.' : 'Add a design or service to your catalogue.'}</p>
        </div>
        <Link to="/admin/products" className="btn btn-ghost btn-sm">
          <Icon name="chevronLeft" size={15} /> Back to products
        </Link>
      </div>

      <form className="card" style={{ maxWidth: 760 }} onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Product name *</label>
          <input
            id="name"
            type="text"
            className="form-control"
            required
            placeholder="e.g. Silk Blouse Design A"
            value={form.name}
            onChange={setField('name')}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            className="form-control"
            rows="4"
            placeholder="Fabric, finishing, styling notes - anything a customer should know."
            value={form.description}
            onChange={setField('description')}
          />
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="price">Price (Rs.) *</label>
            <input
              id="price"
              type="number"
              className="form-control"
              step="0.01"
              min="0"
              required
              placeholder="500"
              value={form.price}
              onChange={setField('price')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="compare_at_price">Compare-at price</label>
            <input
              id="compare_at_price"
              type="number"
              className="form-control"
              step="0.01"
              min="0"
              placeholder="Optional 'was' price"
              value={form.compare_at_price}
              onChange={setField('compare_at_price')}
            />
            <span className="form-hint">
              {discount > 0
                ? `Shows as ${formatCurrency(form.price)} with -${discount}% off.`
                : 'Must be higher than the price to show a discount.'}
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="stock">Stock quantity</label>
            <input
              id="stock"
              type="number"
              className="form-control"
              min="0"
              placeholder="0"
              value={form.stock}
              onChange={setField('stock')}
            />
            <span className="form-hint">0 means made to order - never runs out.</span>
          </div>

          <div className="form-group">
            <label htmlFor="category_id">Category *</label>
            <select
              id="category_id"
              className="form-control"
              required
              value={form.category_id}
              onChange={setField('category_id')}
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name} ({cat.category_type})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="divider" />

        <div className="form-check">
          <input
            type="checkbox"
            id="is_custom_blouse"
            checked={form.is_custom_blouse}
            onChange={setChecked('is_custom_blouse')}
          />
          <label htmlFor="is_custom_blouse">
            Custom blouse design
            <span className="form-hint">
              Appears in the Custom Blouse section and asks the customer for measurements.
            </span>
          </label>
        </div>

        <div className="form-check">
          <input
            type="checkbox"
            id="is_featured"
            checked={form.is_featured}
            onChange={setChecked('is_featured')}
          />
          <label htmlFor="is_featured">
            Feature on the home page
            <span className="form-hint">Highlighted in the "Featured Picks" strip.</span>
          </label>
        </div>

        {isEdit && (
          <div className="form-check">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={setChecked('is_active')}
            />
            <label htmlFor="is_active">
              Visible to customers
              <span className="form-hint">Uncheck to hide from the shop without deleting.</span>
            </label>
          </div>
        )}

        <div className="divider" />

        <div className="form-group">
          <label>Product images</label>
          <div
            className={`image-upload-area ${dragging ? 'dragging' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click() }}
          >
            <Icon name="upload" size={30} />
            <p>Drop images here, or click to browse</p>
            <small>PNG, JPG, JPEG, GIF, or WebP - up to 16 MB each</small>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
          />

          {previews.length > 0 && (
            <div className="existing-images">
              {previews.map((src, index) => (
                <div className="existing-image" key={src}>
                  <img src={src} alt="" />
                  <button
                    type="button"
                    className="delete-img-btn"
                    onClick={() => setNewFiles((files) => files.filter((_, i) => i !== index))}
                    aria-label="Remove image"
                  >
                    <Icon name="x" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {isEdit && existingImages.length > 0 && (
          <div className="form-group">
            <label>Current images</label>
            <div className="existing-images">
              {existingImages.map((img) => (
                <div className="existing-image" key={img.id}>
                  <img src={img.url} alt="Product" />
                  <button
                    type="button"
                    className="delete-img-btn"
                    onClick={() => setImageToDelete(img.id)}
                    aria-label="Delete this image"
                  >
                    <Icon name="x" size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="row" style={{ marginTop: 'var(--sp-5)' }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting ? <span className="spinner" /> : <Icon name="save" size={17} />}
            {isEdit ? 'Save changes' : 'Add product'}
          </button>
          <Link to="/admin/products" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>

      <ConfirmDialog
        open={Boolean(imageToDelete)}
        title="Delete this image?"
        message="The image will be permanently removed from this product."
        confirmLabel="Delete image"
        onConfirm={handleDeleteImage}
        onCancel={() => setImageToDelete(null)}
      />
    </>
  )
}
