import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/useApi'
import { EmptyState } from '../components/ui'

export default function NotFound() {
  usePageTitle('Page not found')

  return (
    <div className="container page" style={{ paddingTop: 'var(--sp-8)', paddingBottom: 'var(--sp-9)' }}>
      <EmptyState
        icon="search"
        title="Page not found"
        description="The page you are looking for doesn't exist or may have moved."
        action={
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/" className="btn btn-primary">Go home</Link>
            <Link to="/products" className="btn btn-outline">Browse products</Link>
          </div>
        }
      />
    </div>
  )
}
