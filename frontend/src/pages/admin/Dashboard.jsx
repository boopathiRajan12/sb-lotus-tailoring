import { Link } from 'react-router-dom'
import { useApi, usePageTitle } from '../../hooks/useApi'
import { formatCompactCurrency, formatCurrency, formatDate } from '../../api/format'
import Icon from '../../components/Icon'
import { CardsSkeleton, EmptyState, Skeleton, StatusBadge } from '../../components/ui'

// Donut slice colours, keyed by order status.
const STATUS_COLORS = {
  pending: 'var(--warning)',
  confirmed: 'var(--info)',
  stitching: 'var(--purple)',
  ready: 'var(--success)',
  delivered: 'var(--primary)',
  cancelled: 'var(--danger)',
}

export default function Dashboard() {
  usePageTitle('Admin Dashboard')
  const { data, loading, error } = useApi('/api/admin/dashboard')

  if (loading) {
    return (
      <>
        <h2 style={{ marginBottom: 'var(--sp-5)' }}>Dashboard</h2>
        <CardsSkeleton count={4} />
        <div className="dashboard-grid">
          <Skeleton height={280} radius="var(--radius)" />
          <Skeleton height={280} radius="var(--radius)" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon="alertCircle"
        title="Couldn't load the dashboard"
        description="Please refresh the page and try again."
      />
    )
  }

  const growth = data.revenue_growth

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>An overview of your shop's orders, revenue, and customers.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link to="/admin/products/add" className="btn btn-primary btn-sm">
            <Icon name="plus" size={15} /> New product
          </Link>
          <Link to="/admin/orders" className="btn btn-subtle btn-sm">View orders</Link>
        </div>
      </div>

      <div className="stat-cards">
        <StatCard
          icon="rupee"
          tone=""
          label="Total revenue"
          value={formatCompactCurrency(data.total_revenue)}
          trend={growth}
          trendLabel="vs last month"
        />
        <StatCard
          icon="clipboard"
          tone="tone-info"
          label="Total orders"
          value={data.total_orders}
          sub={`${data.pending_orders} pending`}
        />
        <StatCard
          icon="scissors"
          tone="tone-purple"
          label="In progress"
          value={data.in_progress_orders}
          sub="Confirmed or stitching"
        />
        <StatCard
          icon="users"
          tone="tone-success"
          label="Customers"
          value={data.total_users}
          sub={`+${data.new_users_month} this month`}
        />
        <StatCard
          icon="package"
          tone="tone-warning"
          label="Products"
          value={data.total_products}
          sub={`${data.active_products} active`}
        />
        <StatCard
          icon="barChart"
          tone=""
          label="Avg. order value"
          value={formatCompactCurrency(data.average_order_value)}
          sub={`${data.total_categories} categories`}
        />
      </div>

      <div className="dashboard-grid">
        <RevenueChart series={data.revenue_series} thisMonth={data.month_revenue} />
        <StatusDonut breakdown={data.status_breakdown} total={data.total_orders} />
      </div>

      <div className="dashboard-grid">
        <div className="chart-card">
          <h3>Best sellers</h3>
          <p className="chart-sub">Ranked by units ordered</p>

          {data.top_products.length > 0 ? (
            <div className="rank-list">
              {data.top_products.map((product, index) => (
                <div className="rank-row" key={product.id}>
                  <span className="rank-num">{index + 1}</span>
                  <div className="rank-info">
                    <strong>{product.name}</strong>
                    <span>{product.units} unit{product.units === 1 ? '' : 's'} sold</span>
                  </div>
                  <span className="rank-value">{formatCompactCurrency(product.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">No sales recorded yet.</p>
          )}
        </div>

        <div className="chart-card">
          <h3>Low stock</h3>
          <p className="chart-sub">5 or fewer left in stock</p>

          {data.low_stock.length > 0 ? (
            <div className="rank-list">
              {data.low_stock.map((product) => (
                <div className="rank-row" key={product.id}>
                  <span className="rank-num" style={{ background: 'var(--warning-soft)', color: 'var(--warning-text)' }}>
                    <Icon name="alertTriangle" size={12} />
                  </span>
                  <div className="rank-info">
                    <strong>{product.name}</strong>
                    <span>{product.category?.name}</span>
                  </div>
                  <Link to={`/admin/products/edit/${product.id}`} className="btn btn-ghost btn-sm">
                    {product.stock} left
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">Nothing is running low. All stocked items look healthy.</p>
          )}
        </div>
      </div>

      <div className="page-header" style={{ marginTop: 'var(--sp-5)' }}>
        <h2 style={{ fontSize: 'var(--text-md)' }}>Recent orders</h2>
        <Link to="/admin/orders" className="btn btn-ghost btn-sm">
          View all <Icon name="arrowRight" size={15} />
        </Link>
      </div>

      {data.recent_orders.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_orders.map((order) => (
                <tr key={order.id}>
                  <td><Link to={`/admin/orders/${order.id}`}><strong>#{order.id}</strong></Link></td>
                  <td>{order.user?.username || 'Unknown'}</td>
                  <td className="num">{formatCurrency(order.total_amount)}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td>{formatDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="clipboard"
          title="No orders yet"
          description="Orders placed by customers will show up here."
        />
      )}
    </>
  )
}

function StatCard({ icon, tone, label, value, sub, trend, trendLabel }) {
  const direction = trend === null || trend === undefined ? null : trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat'

  return (
    <div className="stat-card">
      <div className="stat-head">
        <span className={`stat-icon ${tone}`}><Icon name={icon} size={17} /></span>
        {direction && (
          <span className={`stat-trend ${direction}`}>
            <Icon name={direction === 'down' ? 'arrowDown' : 'arrowUp'} size={11} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stat-number">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="text-xs text-muted" style={{ marginTop: 4 }}>{trendLabel || sub}</div>}
    </div>
  )
}

/** Six-month revenue bars, scaled to the largest month in the window. */
function RevenueChart({ series, thisMonth }) {
  const peak = Math.max(...series.map((point) => point.revenue), 1)

  return (
    <div className="chart-card">
      <h3>Revenue, last 6 months</h3>
      <p className="chart-sub">
        {formatCurrency(thisMonth)} so far this month
      </p>

      <div className="bar-chart">
        {series.map((point) => (
          <div className="bar-col" key={point.month}>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ height: `${Math.max(2, (point.revenue / peak) * 100)}%` }}
                title={`${point.label}: ${formatCurrency(point.revenue)} from ${point.orders} orders`}
              >
                {point.revenue > 0 && (
                  <span className="bar-value">{formatCompactCurrency(point.revenue)}</span>
                )}
              </div>
            </div>
            <span className="bar-label">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Order-status donut built from stroke-dasharray arcs - no chart library. */
function StatusDonut({ breakdown, total }) {
  const active = breakdown.filter((item) => item.count > 0)
  const radius = 54
  const circumference = 2 * Math.PI * radius

  let offset = 0
  const arcs = active.map((item) => {
    const fraction = total ? item.count / total : 0
    const arc = {
      ...item,
      dash: fraction * circumference,
      gap: circumference - fraction * circumference,
      offset: -offset,
    }
    offset += fraction * circumference
    return arc
  })

  return (
    <div className="chart-card">
      <h3>Orders by status</h3>
      <p className="chart-sub">{total} order{total === 1 ? '' : 's'} in total</p>

      {total > 0 ? (
        <div className="donut-wrap">
          <svg className="donut" width="140" height="140" viewBox="0 0 140 140">
            <circle
              cx="70" cy="70" r={radius}
              fill="none" stroke="var(--bg-sunken)" strokeWidth="18"
            />
            {arcs.map((arc) => (
              <circle
                key={arc.status}
                cx="70" cy="70" r={radius}
                fill="none"
                stroke={STATUS_COLORS[arc.status] || 'var(--text-muted)'}
                strokeWidth="18"
                strokeDasharray={`${arc.dash} ${arc.gap}`}
                strokeDashoffset={arc.offset}
              >
                <title>{`${arc.status}: ${arc.count}`}</title>
              </circle>
            ))}
          </svg>

          <div className="donut-legend">
            {breakdown.map((item) => (
              <div className="legend-row" key={item.status}>
                <span
                  className="legend-swatch"
                  style={{ background: STATUS_COLORS[item.status] || 'var(--text-muted)' }}
                />
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                <span className="legend-value">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-muted text-sm">No orders to break down yet.</p>
      )}
    </div>
  )
}
