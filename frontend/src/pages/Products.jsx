import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApi, useDebounced, usePageTitle } from '../hooks/useApi'
import ProductCard from '../components/ProductCard'
import Pagination from '../components/Pagination'
import Icon from '../components/Icon'
import { EmptyState, ProductGridSkeleton } from '../components/ui'

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_low', label: 'Price: low to high' },
  { value: 'price_high', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'name', label: 'Name (A-Z)' },
]

export default function Products() {
  usePageTitle('Products')
  const [searchParams, setSearchParams] = useSearchParams()

  const category = searchParams.get('category') || ''
  const q = searchParams.get('q') || ''
  const page = searchParams.get('page') || '1'
  const sort = searchParams.get('sort') || 'newest'
  const minPrice = searchParams.get('min_price') || ''
  const maxPrice = searchParams.get('max_price') || ''
  const customOnly = searchParams.get('custom') === '1'

  // Local mirrors so typing feels instant while the URL updates on a delay.
  const [searchInput, setSearchInput] = useState(q)
  const [priceDraft, setPriceDraft] = useState({ min: minPrice, max: maxPrice })
  const debouncedSearch = useDebounced(searchInput, 400)

  useEffect(() => { setSearchInput(q) }, [q])
  useEffect(() => { setPriceDraft({ min: minPrice, max: maxPrice }) }, [minPrice, maxPrice])

  // Push the debounced search term into the URL, resetting to page 1.
  useEffect(() => {
    if (debouncedSearch === q) return
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (debouncedSearch.trim()) next.set('q', debouncedSearch.trim())
      else next.delete('q')
      next.delete('page')
      return next
    }, { replace: true })
  }, [debouncedSearch, q, setSearchParams])

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (q) params.set('q', q)
    if (page !== '1') params.set('page', page)
    if (sort !== 'newest') params.set('sort', sort)
    if (minPrice) params.set('min_price', minPrice)
    if (maxPrice) params.set('max_price', maxPrice)
    if (customOnly) params.set('custom', '1')
    return params.toString()
  }, [category, q, page, sort, minPrice, maxPrice, customOnly])

  const { data, loading, error } = useApi(`/api/products?${queryString}`)

  const patchParams = (patch, { resetPage = true } = {}) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(patch).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined) next.delete(key)
        else next.set(key, String(value))
      })
      if (resetPage) next.delete('page')
      return next
    })
  }

  const buildHref = (nextPage) => {
    const params = new URLSearchParams(searchParams)
    if (nextPage && nextPage !== 1) params.set('page', String(nextPage))
    else params.delete('page')
    const qs = params.toString()
    return qs ? `/products?${qs}` : '/products'
  }

  const applyPrice = (event) => {
    event.preventDefault()
    patchParams({ min_price: priceDraft.min, max_price: priceDraft.max })
  }

  const clearAll = () => setSearchParams(new URLSearchParams())

  const categories = data?.categories || []
  const products = data?.products || []
  const total = data?.pagination?.total ?? 0
  const hasFilters = Boolean(category || q || minPrice || maxPrice || customOnly || sort !== 'newest')

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h2>Our Products</h2>
          <p>Browse every design we stitch, filter by service, price, or rating.</p>
        </div>
        {hasFilters && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
            <Icon name="x" size={15} /> Clear filters
          </button>
        )}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <div className="input-group">
            <span className="input-group-icon"><Icon name="search" size={17} /></span>
            <input
              type="search"
              className="form-control"
              placeholder="Search designs, fabrics, descriptions..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search products"
            />
          </div>
        </div>

        <form className="price-filter" onSubmit={applyPrice}>
          <input
            type="number"
            min="0"
            placeholder="Min Rs."
            value={priceDraft.min}
            onChange={(e) => setPriceDraft((p) => ({ ...p, min: e.target.value }))}
            aria-label="Minimum price"
          />
          <span>to</span>
          <input
            type="number"
            min="0"
            placeholder="Max Rs."
            value={priceDraft.max}
            onChange={(e) => setPriceDraft((p) => ({ ...p, max: e.target.value }))}
            aria-label="Maximum price"
          />
          <button type="submit" className="btn btn-subtle btn-sm">Go</button>
        </form>

        <select
          className="form-control"
          value={sort}
          onChange={(e) => patchParams({ sort: e.target.value })}
          aria-label="Sort products"
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <label className="chip" style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={customOnly}
            onChange={(e) => patchParams({ custom: e.target.checked ? '1' : '' })}
            style={{ accentColor: 'var(--primary)' }}
          />
          Custom only
        </label>

        <span className="spacer" />
        <span className="toolbar-results">
          {loading ? 'Loading...' : `${total} product${total === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className="chip-row" style={{ marginBottom: 'var(--sp-5)' }}>
        <button
          type="button"
          className={`chip ${!category ? 'active' : ''}`}
          onClick={() => patchParams({ category: '' })}
        >
          All services
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`chip ${String(category) === String(cat.id) ? 'active' : ''}`}
            onClick={() => patchParams({ category: cat.id })}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : error ? (
        <EmptyState
          icon="alertCircle"
          title="Couldn't load products"
          description="Something went wrong fetching the catalogue. Please refresh and try again."
        />
      ) : products.length > 0 ? (
        <>
          <div className="product-grid fade-in">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination pagination={data.pagination} buildHref={buildHref} />
        </>
      ) : (
        <EmptyState
          icon="search"
          title="No products match those filters"
          description="Try a different search term, widen the price range, or browse all categories."
          action={
            hasFilters && (
              <button type="button" className="btn btn-primary" onClick={clearAll}>
                Clear all filters
              </button>
            )
          }
        />
      )}
    </div>
  )
}
