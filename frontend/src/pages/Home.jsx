import { Link } from 'react-router-dom'
import { useApi, usePageTitle } from '../hooks/useApi'
import ProductCard from '../components/ProductCard'
import Icon from '../components/Icon'
import { EmptyState, ProductGridSkeleton, SectionHead } from '../components/ui'

// Category names map onto icons; anything unrecognised falls back to scissors.
const CATEGORY_ICONS = {
  blouse: 'shirt',
  'school uniform': 'users',
  sudithar: 'shirt',
  tops: 'shirt',
  pants: 'ruler',
  'pavadai & sattai': 'sparkles',
  sarees: 'sparkles',
  'ready-made pavadai': 'bag',
  'ready-made blouse': 'bag',
  'ready-made sudithar': 'bag',
  'blouse lining': 'layers',
  'top lining': 'layers',
}

const PROMISES = [
  { icon: 'ruler', title: 'Precise measurements', text: 'Every garment cut to your exact numbers, saved for reorders.' },
  { icon: 'scissors', title: 'Hand-finished', text: 'Careful stitching and finishing on every single piece.' },
  { icon: 'truck', title: 'Pay on delivery', text: 'No online payment needed. Settle up when you collect.' },
  { icon: 'refresh', title: 'Free alterations', text: 'Not sitting right? Bring it back and we will adjust it.' },
]

function categoryIcon(name) {
  return CATEGORY_ICONS[(name || '').toLowerCase()] || 'scissors'
}

export default function Home() {
  usePageTitle('')
  const { data, loading, error } = useApi('/api/home')

  const categories = data?.categories || []
  const products = data?.products || []
  const featured = data?.featured || []
  const topRated = data?.top_rated || []
  const stats = data?.stats

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <span className="eyebrow">Tailoring, done properly</span>
          <h1>Stitched to fit <em>you</em>, not a size chart</h1>
          <p>
            Blouses, uniforms, sudithars, and traditional dresses - measured, cut, and
            finished by hand at SB Lotus Tailoring Shop.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="btn btn-secondary btn-lg">
              Browse the collection
            </Link>
            <Link to="/custom-blouse" className="btn btn-outline btn-lg">
              Custom blouse designs
            </Link>
          </div>

          {stats && (
            <div className="hero-stats">
              <div className="hero-stat">
                <strong>{stats.products}</strong>
                <span>Designs</span>
              </div>
              <div className="hero-stat">
                <strong>{stats.categories}</strong>
                <span>Services</span>
              </div>
              <div className="hero-stat">
                <strong>{stats.reviews}</strong>
                <span>Reviews</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section-sm">
        <div className="container">
          <div className="feature-strip">
            {PROMISES.map((promise) => (
              <div className="feature-item" key={promise.title}>
                <span className="feature-icon"><Icon name={promise.icon} size={20} /></span>
                <div>
                  <strong>{promise.title}</strong>
                  <p>{promise.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">What We Stitch</h2>

          {loading ? (
            <div className="category-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div className="skeleton" key={i} style={{ height: 148, borderRadius: 'var(--radius)' }} />
              ))}
            </div>
          ) : (
            <div className="category-grid">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/products?category=${category.id}`}
                  className="category-tile"
                >
                  <span className="tile-icon"><Icon name={categoryIcon(category.name)} size={22} /></span>
                  <strong>{category.name}</strong>
                  {category.description && <small>{category.description}</small>}
                  <span className="tile-count">
                    {category.product_count > 0
                      ? `${category.product_count} design${category.product_count > 1 ? 's' : ''}`
                      : 'Coming soon'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {(loading || featured.length > 0) && (
        <section className="section-alt section">
          <div className="container">
            <SectionHead
              title="Featured Picks"
              subtitle="Hand-selected designs our customers keep coming back for"
              to="/products"
            />
            {loading ? <ProductGridSkeleton count={4} /> : (
              <div className="product-grid">
                {featured.slice(0, 4).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <SectionHead
            title="Latest Arrivals"
            subtitle="The newest designs added to the shop"
            to="/products"
          />

          {loading ? (
            <ProductGridSkeleton count={8} />
          ) : error ? (
            <EmptyState
              icon="alertCircle"
              title="Couldn't load products"
              description="Please check your connection and refresh the page."
            />
          ) : products.length > 0 ? (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="package"
              title="No products yet"
              description="New designs are being added. Please check back soon."
            />
          )}
        </div>
      </section>

      {topRated.length > 0 && (
        <section className="section-alt section">
          <div className="container">
            <SectionHead title="Highest Rated" subtitle="Loved by the customers who wore them" />
            <div className="product-grid">
              {topRated.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="card text-center" style={{ padding: 'var(--sp-7) var(--sp-5)' }}>
            <span className="eyebrow">Made just for you</span>
            <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--sp-3)' }}>
              Custom Blouse Designs
            </h2>
            <p className="text-light" style={{ maxWidth: 560, margin: '0 auto var(--sp-5)' }}>
              Pick a design you love, enter your measurements once, and we stitch it to
              fit perfectly. Your measurements are saved for every order after that.
            </p>
            <Link to="/custom-blouse" className="btn btn-primary btn-lg">
              <Icon name="ruler" size={18} /> View blouse designs
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
