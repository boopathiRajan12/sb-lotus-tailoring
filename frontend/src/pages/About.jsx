import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/useApi'
import Icon from '../components/Icon'

const SERVICES = [
  { icon: 'shirt', title: 'Blouse Stitching', text: 'Custom-fitted blouses in any design (Aari work not offered yet).' },
  { icon: 'users', title: 'School Uniforms', text: 'Uniforms for all grades, stitched to school specification.' },
  { icon: 'shirt', title: 'Sudithar Stitching', text: 'Traditional sudithars, cut and finished to your measurements.' },
  { icon: 'shirt', title: 'Tops', text: 'Modern tops in the cut and length you want.' },
  { icon: 'ruler', title: 'Pants', text: 'All types of pants, hemmed to your exact leg length.' },
  { icon: 'sparkles', title: 'Pavadai & Sattai', text: 'Traditional two-piece sets for every occasion.' },
]

const COMING_SOON = [
  'Sarees Collection',
  'Ready-made Pavadai',
  'Ready-made Blouse',
  'Blouse Lining',
  'Top Lining',
  'Ready-made Sudithar',
]

export default function About() {
  usePageTitle('About Us')

  return (
    <div className="container page">
      <div className="text-center" style={{ maxWidth: 640, margin: '0 auto var(--sp-7)' }}>
        <span className="eyebrow">Our story</span>
        <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--sp-3)' }}>
          About SB Lotus Tailoring Shop
        </h2>
        <p className="text-light">
          We are dedicated to high-quality stitching and tailoring. Every garment is cut and
          finished with precision and care, so it fits the person wearing it - not a generic
          size chart.
        </p>
      </div>

      <section className="section-sm">
        <h3 className="section-title">What We Do</h3>
        <div className="category-grid">
          {SERVICES.map((service) => (
            <div className="category-tile" key={service.title} style={{ cursor: 'default' }}>
              <span className="tile-icon"><Icon name={service.icon} size={22} /></span>
              <strong>{service.title}</strong>
              <small>{service.text}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="section-sm">
        <div className="card">
          <h3 style={{ marginBottom: 'var(--sp-2)' }}>Coming Soon</h3>
          <p className="text-muted text-sm" style={{ marginBottom: 'var(--sp-4)' }}>
            We are expanding into ready-made pieces alongside our stitching services.
          </p>
          <div className="chip-row">
            {COMING_SOON.map((item) => (
              <span className="chip" key={item} style={{ cursor: 'default' }}>
                <Icon name="clock" size={13} /> {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="card text-center" style={{ padding: 'var(--sp-7) var(--sp-5)' }}>
          <div
            className="feature-icon"
            style={{ margin: '0 auto var(--sp-4)', width: 52, height: 52 }}
          >
            <Icon name="mapPin" size={24} />
          </div>
          <h3 style={{ marginBottom: 'var(--sp-2)' }}>Visit Us</h3>
          <p className="text-light" style={{ maxWidth: 480, margin: '0 auto var(--sp-5)' }}>
            Come to the shop for measurements and consultations. We will talk through
            fabric, fit, and finishing before a single stitch is made.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/products" className="btn btn-primary">Browse products</Link>
            <Link to="/custom-blouse" className="btn btn-outline">Custom blouse designs</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
