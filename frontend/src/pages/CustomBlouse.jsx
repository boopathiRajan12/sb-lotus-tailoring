import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { formatCurrency } from '../api/format'

const DEFAULT_IMAGE = '/default-product.svg'

export default function CustomBlouse() {
  const [designs, setDesigns] = useState([])

  useEffect(() => {
    api.get('/api/custom-blouse').then((data) => setDesigns(data.designs))
  }, [])

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <h2 className="section-title">Custom Blouse Designs</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-light)', maxWidth: 600, margin: '-15px auto 30px' }}>
        Browse our pre-stitched blouse designs. Select a design you love, provide your measurements, and we will stitch it perfectly for you.
      </p>

      {designs.length > 0 ? (
        <div className="blouse-grid">
          {designs.map((design) => (
            <div className="blouse-card" key={design.id}>
              <Link to={`/products/${design.id}`}>
                <img
                  src={design.images[0]?.url || DEFAULT_IMAGE}
                  alt={design.name}
                  className="blouse-card-img"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_IMAGE }}
                />
              </Link>
              <div className="blouse-card-body">
                <h3>{design.name}</h3>
                {design.description && (
                  <p style={{ color: 'var(--text-light)', marginBottom: 10, fontSize: '0.9rem' }}>
                    {design.description.slice(0, 100)}{design.description.length > 100 ? '...' : ''}
                  </p>
                )}
                <div className="price" style={{ marginBottom: 15 }}>{formatCurrency(design.price)}</div>
                <Link to={`/products/${design.id}`} className="btn btn-primary btn-sm">Select This Design</Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No designs available yet</h3>
          <p>Check back soon! We are adding new blouse designs regularly.</p>
        </div>
      )}
    </div>
  )
}
