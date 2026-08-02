import { Link } from 'react-router-dom'
import Icon from './Icon'

const SERVICES = [
  'Blouse Stitching',
  'School Uniforms',
  'Sudithar Stitching',
  'Tops & Pants',
  'Pavadai & Sattai',
]

const LINKS = [
  { to: '/products', label: 'Browse Products' },
  { to: '/custom-blouse', label: 'Custom Blouse Designs' },
  { to: '/about', label: 'About Us' },
  { to: '/my-orders', label: 'Track My Order' },
]

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <img src="/logo.png" alt="SB Lotus Logo" className="brand-logo" />
              <strong>SB Lotus Tailoring Shop</strong>
            </div>
            <p>
              Quality stitching and tailoring for all your needs. From blouses to school
              uniforms, every garment is measured, cut, and finished with care.
            </p>
          </div>

          <div>
            <h4>Our Services</h4>
            <ul>
              {SERVICES.map((service) => <li key={service}>{service}</li>)}
            </ul>
          </div>

          <div>
            <h4>Quick Links</h4>
            <ul>
              {LINKS.map((link) => (
                <li key={link.to}><Link to={link.to}>{link.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Visit Us</h4>
            <div className="footer-contact">
              <span className="footer-contact-row">
                <Icon name="mapPin" size={15} />
                Come by the shop for measurements and consultations.
              </span>
              <span className="footer-contact-row">
                <Icon name="clock" size={15} />
                Mon - Sat, 9:00 AM to 8:00 PM
              </span>
              <span className="footer-contact-row">
                <Icon name="scissors" size={15} />
                Made-to-order stitching, no advance payment.
              </span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          &copy; {new Date().getFullYear()} SB Lotus Tailoring Shop. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
