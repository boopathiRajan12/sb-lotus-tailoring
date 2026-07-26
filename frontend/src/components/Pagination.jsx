import { Link } from 'react-router-dom'

// Mirrors Flask-SQLAlchemy's Pagination.iter_pages(left_edge=1, right_edge=1, left_current=2, right_current=2)
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
  const { page, pages, has_prev, has_next } = pagination
  if (pages <= 1) return null

  return (
    <div className="pagination">
      {has_prev && <Link to={buildHref(page - 1)}>Prev</Link>}
      {iterPages(page, pages).map((num, idx) =>
        num === null ? (
          <span key={`gap-${idx}`}>...</span>
        ) : num === page ? (
          <span key={num} className="active-page">{num}</span>
        ) : (
          <Link key={num} to={buildHref(num)}>{num}</Link>
        )
      )}
      {has_next && <Link to={buildHref(page + 1)}>Next</Link>}
    </div>
  )
}
