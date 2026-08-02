import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi, useDebounced, usePageTitle } from '../../hooks/useApi'
import { formatCurrency, formatDate } from '../../api/format'
import Icon from '../../components/Icon'
import { EmptyState, StatusBadge, TableSkeleton } from '../../components/ui'

const STATUSES = ['pending', 'confirmed', 'stitching', 'ready', 'delivered', 'cancelled']
const RANGES = [
  { value: '', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 3 months' },
]

export default function Orders() {
  usePageTitle('Admin Orders')
  const [status, setStatus] = useState('')
  const [days, setDays] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 400)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (days) params.set('days', days)
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
    return params.toString()
  }, [status, days, debouncedSearch])

  const { data, loading, error } = useApi(`/api/admin/orders?${query}`)
  const orders = data?.orders || []
  const hasFilters = Boolean(status || days || debouncedSearch)

  const clearFilters = () => { setStatus(''); setDays(''); setSearch('') }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Orders</h2>
          <p>
            {loading ? 'Loading...' : `${data.total} order${data.total === 1 ? '' : 's'}`}
            {!loading && data.filtered_revenue > 0 && ` · ${formatCurrency(data.filtered_revenue)} in this view`}
          </p>
        </div>

        <a
          href={`/api/admin/orders/export?${query}`}
          className="btn btn-subtle btn-sm"
          download
        >
          <Icon name="download" size={15} /> Export CSV
        </a>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <div className="input-group">
            <span className="input-group-icon"><Icon name="search" size={17} /></span>
            <input
              type="search"
              className="form-control"
              placeholder="Search by order #, customer, email, or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search orders"
            />
          </div>
        </div>

        <select
          className="form-control"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>

        <select
          className="form-control"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          aria-label="Filter by date"
        >
          {RANGES.map((range) => (
            <option key={range.value} value={range.value}>{range.label}</option>
          ))}
        </select>

        {hasFilters && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
            <Icon name="x" size={15} /> Clear
          </button>
        )}
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : error ? (
        <EmptyState icon="alertCircle" title="Couldn't load orders" description="Please refresh and try again." />
      ) : orders.length > 0 ? (
        <div className="table-wrap fade-in">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Phone</th>
                <th className="num">Items</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><Link to={`/admin/orders/${order.id}`}><strong>#{order.id}</strong></Link></td>
                  <td>
                    {order.user ? (
                      <Link to={`/admin/users/${order.user.id}`}>{order.user.username}</Link>
                    ) : 'Unknown'}
                  </td>
                  <td>{order.phone || '-'}</td>
                  <td className="num">{order.item_count}</td>
                  <td className="num">{formatCurrency(order.total_amount)}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td>{formatDate(order.created_at)}</td>
                  <td>
                    <Link to={`/admin/orders/${order.id}`} className="btn btn-outline btn-sm">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="clipboard"
          title={hasFilters ? 'No orders match those filters' : 'No orders yet'}
          description={
            hasFilters
              ? 'Try a different status, date range, or search term.'
              : 'Orders will appear here when customers place them.'
          }
          action={
            hasFilters && (
              <button type="button" className="btn btn-primary" onClick={clearFilters}>
                Clear filters
              </button>
            )
          }
        />
      )}
    </>
  )
}
