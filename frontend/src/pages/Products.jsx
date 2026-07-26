import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import ProductCard from '../components/ProductCard'
import Pagination from '../components/Pagination'

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')

  const category = searchParams.get('category') || ''
  const q = searchParams.get('q') || ''
  const page = searchParams.get('page') || '1'

  useEffect(() => {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (q) params.set('q', q)
    if (page) params.set('page', page)
    api.get(`/api/products?${params.toString()}`).then(setData)
  }, [category, q, page])

  useEffect(() => {
    setSearchInput(q)
  }, [q])

  const buildHref = (nextPage) => {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (q) params.set('q', q)
    if (nextPage && nextPage !== 1) params.set('page', String(nextPage))
    const qs = params.toString()
    return qs ? `/products?${qs}` : '/products'
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (searchInput.trim()) params.set('q', searchInput.trim())
    setSearchParams(params)
  }

  if (!data) return null

  return (
    <div className="container" style={{ padding: '30px 0' }}>
      <h2 className="section-title">Our Products</h2>

      <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap', marginBottom: 25, justifyContent: 'center' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <input
            type="text"
            className="form-control"
            style={{ maxWidth: 300 }}
            placeholder="Search products..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>
      </div>

      <div className="category-cards" style={{ marginBottom: 30 }}>
        <a
          href={buildHref()}
          className={`category-card ${!category ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); const p = new URLSearchParams(); if (q) p.set('q', q); setSearchParams(p) }}
        >
          All
        </a>
        {data.categories.map((cat) => (
          <a
            key={cat.id}
            href={buildHref()}
            className={`category-card ${String(category) === String(cat.id) ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              const p = new URLSearchParams()
              p.set('category', cat.id)
              if (q) p.set('q', q)
              setSearchParams(p)
            }}
          >
            {cat.name}
          </a>
        ))}
      </div>

      {data.products.length > 0 ? (
        <>
          <div className="product-grid">
            {data.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination pagination={data.pagination} buildHref={buildHref} />
        </>
      ) : (
        <div className="empty-state">
          <h3>No products found</h3>
          <p>Try a different search or browse all categories.</p>
        </div>
      )}
    </div>
  )
}
