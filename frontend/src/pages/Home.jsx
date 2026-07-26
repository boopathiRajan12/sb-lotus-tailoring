import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import ProductCard from '../components/ProductCard'

export default function Home() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])

  useEffect(() => {
    api.get('/api/home').then((data) => {
      setCategories(data.categories)
      setProducts(data.products)
    })
  }, [])

  return (
    <>
      <section className="hero">
        <h1>SB LOTUS TAILORING SHOP</h1>
        <p>Quality stitching and tailoring for blouses, uniforms, sudithars, and traditional dresses. Crafted with precision and care.</p>
        <Link to="/products" className="btn btn-secondary btn-lg">Browse Our Collection</Link>
      </section>

      <section style={{ padding: '50px 0' }}>
        <div className="container">
          <h2 className="section-title">Our Services</h2>
          <div className="category-cards">
            {categories.map((category) => (
              <Link key={category.id} to={`/products?category=${category.id}`} className="category-card">
                <strong>{category.name}</strong>
                {category.description && <><br /><small>{category.description}</small></>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {products.length > 0 && (
        <section style={{ padding: '30px 0 60px' }}>
          <div className="container">
            <h2 className="section-title">Latest Products</h2>
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div style={{ textAlign: 'center', paddingTop: '20px' }}>
              <Link to="/products" className="btn btn-outline">View All Products</Link>
            </div>
          </div>
        </section>
      )}

      <section style={{ background: 'var(--accent)', padding: '50px 0', textAlign: 'center' }}>
        <div className="container">
          <h2 className="section-title">Custom Blouse Designs</h2>
          <p style={{ maxWidth: 600, margin: '0 auto 25px', color: 'var(--text-light)' }}>
            Browse our collection of beautifully stitched blouse designs. Select your favourite design, provide your measurements, and we will stitch it perfectly for you.
          </p>
          <Link to="/custom-blouse" className="btn btn-primary btn-lg">View Blouse Designs</Link>
        </div>
      </section>
    </>
  )
}
