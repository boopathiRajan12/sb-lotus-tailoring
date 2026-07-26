import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="empty-state" style={{ padding: '100px 20px' }}>
      <h3>Page not found</h3>
      <p>The page you are looking for does not exist.</p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: 15 }}>Go Home</Link>
    </div>
  )
}
