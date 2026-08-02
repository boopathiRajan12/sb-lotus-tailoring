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

export default function Pagination({ pagination, buildHref }) {
  const { page, pages, has_prev: hasPrev, has_next: hasNext } = pagination
  if (pages <= 1) return null

  return (
    <nav className="pagination" aria-label="Pagination">
      {hasPrev && (
        <Link to={buildHref(page - 1)} aria-label="Previous page">
          <Icon name="chevronLeft" size={16} />
        </Link>
      )}

      {iterPages(page, pages).map((num, idx) =>
        num === null ? (
          <span key={`gap-${idx}`} aria-hidden="true">...</span>
        ) : num === page ? (
          <span key={num} className="active-page" aria-current="page">{num}</span>
        ) : (
          <Link key={num} to={buildHref(num)}>{num}</Link>
        )
      )}

      {hasNext && (
        <Link to={buildHref(page + 1)} aria-label="Next page">
          <Icon name="chevronRight" size={16} />
        </Link>
      )}
    </nav>
  )
}
