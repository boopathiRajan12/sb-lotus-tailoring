import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi, useDebounced, usePageTitle } from '../../hooks/useApi'
import { formatCurrency, formatDate, initials } from '../../api/format'
import Icon from '../../components/Icon'
import { CardsSkeleton, EmptyState, TableSkeleton } from '../../components/ui'
import Pagination from '../../components/Pagination'

export default function Users() {
  usePageTitle('Admin Customers')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounced(search, 400)

  const filters = useMemo(() => {
    const params = new URLSearchParams()
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
    return params.toString()
  }, [debouncedSearch])

  useEffect(() => { setPage(1) }, [filters])

  const { data, loading, error } = useApi(
    `/api/admin/users?${filters ? `${filters}&` : ''}page=${page}`
  )
  const stats = data?.user_stats || []

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Customers</h2>
          <p>Everyone registered on the shop, with their order history.</p>
        </div>
      </div>

      {loading ? <CardsSkeleton count={3} height={100} /> : (
        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-head">
              <span className="stat-icon"><Icon name="users" size={17} /></span>
            </div>
            <div className="stat-number">{data.total_users}</div>
            <div className="stat-label">Total customers</div>
          </div>
          <div className="stat-card">
            <div className="stat-head">
              <span className="stat-icon tone-success"><Icon name="sparkles" size={17} /></span>
            </div>
            <div className="stat-number">{data.new_users_month}</div>
            <div className="stat-label">New this month</div>
          </div>
          <div className="stat-card">
            <div className="stat-head">
              <span className="stat-icon tone-warning"><Icon name="slash" size={17} /></span>
            </div>
            <div className="stat-number">{data.suspended_users}</div>
            <div className="stat-label">Suspended</div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="search-box">
          <div className="input-group">
            <span className="input-group-icon"><Icon name="search" size={17} /></span>
            <input
              type="search"
              className="form-control"
              placeholder="Search by username or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search customers"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : error ? (
        <EmptyState icon="alertCircle" title="Couldn't load customers" description="Please refresh and try again." />
      ) : stats.length > 0 ? (
        <div className="table-wrap fade-in">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Registered</th>
                <th className="num">Orders</th>
                <th className="num">Total spent</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {stats.map(({ user, total_orders: totalOrders, total_spent: totalSpent }) => (
                <tr key={user.id}>
                  <td>
                    <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                      <span className="table-avatar">{initials(user.username)}</span>
                      <div>
                        <strong>{user.username}</strong>
                        {!user.is_active_account && (
                          <div><span className="badge badge-cancelled">Suspended</span></div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.phone || '-'}</td>
                  <td>{formatDate(user.created_at)}</td>
                  <td className="num">{totalOrders}</td>
                  <td className="num">{formatCurrency(totalSpent)}</td>
                  <td>
                    <Link to={`/admin/users/${user.id}`} className="btn btn-outline btn-sm">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="users"
          title={debouncedSearch ? 'No customers match that search' : 'No customers yet'}
          description={
            debouncedSearch
              ? 'Try a different username or email.'
              : 'Customers appear here once they register on the shop.'
          }
        />
      )}

      {data?.pagination && (
        <Pagination pagination={data.pagination} onNavigate={setPage} />
      )}
    </>
  )
}
