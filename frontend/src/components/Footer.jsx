import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>SB Lotus Tailoring Shop</h4>
            <p>Quality stitching and tailoring services for all your needs. From blouses to school uniforms, we craft with care.</p>
          </div>
          <div>
            <h4>Our Services</h4>
            <ul>
              <li>Blouse Stitching</li>
              <li>School Uniforms</li>
              <li>Sudithar Stitching</li>
              <li>Tops &amp; Pants</li>
              <li>Pavadai &amp; Sattai</li>
            </ul>
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/products">Browse Products</Link></li>
              <li><Link to="/custom-blouse">Custom Blouse Designs</Link></li>
              <li><Link to="/about">About Us</Link></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <p>Visit us at our shop for measurements and consultations.</p>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; 2026 SB Lotus Tailoring Shop. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
