import { Link } from 'react-router-dom'
import { useApi, usePageTitle } from '../hooks/useApi'
import ProductCard from '../components/ProductCard'
import Icon from '../components/Icon'
import { EmptyState, ProductGridSkeleton } from '../components/ui'

const STEPS = [
  { icon: 'image', title: 'Pick a design', text: 'Browse our stitched blouse designs and choose the one you like.' },
  { icon: 'ruler', title: 'Add measurements', text: 'Enter your numbers once - we save them for future orders.' },
  { icon: 'scissors', title: 'We stitch it', text: 'Your blouse is cut and finished to your exact measurements.' },
  { icon: 'truck', title: 'Collect and pay', text: 'Pick it up or have it delivered. Pay when you receive it.' },
]

export default function CustomBlouse() {
  usePageTitle('Custom Blouse Designs')
  const { data, loading, error } = useApi('/api/custom-blouse')
  const designs = data?.designs || []

  return (
    <div className="container page">
      <div className="text-center" style={{ maxWidth: 640, margin: '0 auto var(--sp-6)' }}>
        <span className="eyebrow">Made to your measurements</span>
        <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--sp-3)' }}>
          Custom Blouse Designs
        </h2>
        <p className="text-light">
          Browse our pre-stitched designs, pick your favourite, and we will craft it to
          fit you exactly. No two bodies are the same, and no two blouses should be either.
        </p>
      </div>

      <div className="feature-strip" style={{ marginBottom: 'var(--sp-7)' }}>
        {STEPS.map((step, index) => (
          <div className="feature-item" key={step.title}>
            <span className="feature-icon"><Icon name={step.icon} size={20} /></span>
            <div>
              <strong>{index + 1}. {step.title}</strong>
              <p>{step.text}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <ProductGridSkeleton count={6} />
      ) : error ? (
        <EmptyState
          icon="alertCircle"
          title="Couldn't load designs"
          description="Something went wrong. Please refresh and try again."
        />
      ) : designs.length > 0 ? (
        <div className="product-grid fade-in">
          {designs.map((design) => (
            <ProductCard key={design.id} product={design} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="shirt"
          title="No designs available yet"
          description="We are adding new blouse designs regularly. Check back soon, or visit the shop to discuss a custom piece."
          action={<Link to="/products" className="btn btn-primary">Browse other products</Link>}
        />
      )}
    </div>
  )
}
