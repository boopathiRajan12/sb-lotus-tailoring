import { Link } from 'react-router-dom'
import Icon from './Icon'

// Mirrors Flask-SQLAlchemy's Pagination.iter_pages(left_edge=1, right_edge=1,
// left_current=2, right_current=2): edges always shown, a window around the
// current page, and `null` marking an elided run.
function iterPages(page, pages, leftEdge = 1, rightEdge = 1, leftCurrent = 2, rightCurrent = 2) {
  const result = []
  let lastShown = 0
  for (let num = 1; num <= pages; num++) {
    const inEdge = num <= leftEdge || num > pages - rightEdge
    const inCurrent = num >= page - leftCurrent && num <= page + rightCurrent
    if (inEdge || inCurrent) {
      if (lastShown && num - lastShown > 1) result.push(null)
      result.push(num)
      lastShown = num
    }
  }
  return result
}

// One page control, rendered as a link when the page lives in the URL and as a
// button when it lives in component state. Declared at module scope so React
// sees the same component type across renders.
function PageLink({ to, buildHref, onNavigate, children, ...rest }) {
  if (buildHref) {
    return <Link to={buildHref(to)} {...rest}>{children}</Link>
  }
  return <button type="button" onClick={() => onNavigate(to)} {...rest}>{children}</button>
}

// Pass `buildHref` on pages whose filters live in the URL, or `onNavigate` on
// pages that hold them in local state (the admin tables) - there is no route to
// link to there, so the same markup renders as buttons instead.
export default function Pagination({ pagination, buildHref, onNavigate }) {
  const { page, pages, has_prev: hasPrev, has_next: hasNext } = pagination
  if (pages <= 1) return null

  const nav = { buildHref, onNavigate }

  return (
    <nav className="pagination" aria-label="Pagination">
      {hasPrev && (
        <PageLink to={page - 1} {...nav} aria-label="Previous page">
          <Icon name="chevronLeft" size={16} />
        </PageLink>
      )}

      {iterPages(page, pages).map((num, idx) =>
        num === null ? (
          <span key={`gap-${idx}`} aria-hidden="true">...</span>
        ) : num === page ? (
          <span key={num} className="active-page" aria-current="page">{num}</span>
        ) : (
          <PageLink key={num} to={num} {...nav}>{num}</PageLink>
        )
      )}

      {hasNext && (
        <PageLink to={page + 1} {...nav} aria-label="Next page">
          <Icon name="chevronRight" size={16} />
        </PageLink>
      )}
    </nav>
  )
}
