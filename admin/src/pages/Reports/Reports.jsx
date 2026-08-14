import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import ExportButtons from '../../components/common/ExportButtons';
import Loader from '../../components/common/Loader';
import StatCard from '../../components/common/StatCard';
import WaveChart from '../../components/charts/WaveChart';
import reportService from '../../services/reportService';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../../utils/formatters';

const REPORT_TYPES = [
  { key: 'sales', label: 'Sales', icon: 'bi-graph-up' },
  { key: 'products', label: 'Products', icon: 'bi-box-seam' },
  { key: 'customers', label: 'Customers', icon: 'bi-people' },
];

const MONTHS = [
  { value: 'all', label: 'All months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const Reports = ({ embedded = false } = {}) => {
  const now = new Date();
  const [reportType, setReportType] = useState('sales');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { year, month };
        let result = null;
        if (reportType === 'sales') result = await reportService.sales(params);
        else if (reportType === 'products') result = await reportService.products(params);
        else result = await reportService.customers(params);
        setPayload(result);
      } catch {
        setPayload(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year, month, reportType]);

  const items = payload?.items || [];
  const summary = payload?.summary || {};
  const years = useMemo(() => {
    const set = new Set([...(payload?.available_years || []), year, now.getFullYear()]);
    return [...set].sort((a, b) => b - a);
  }, [payload?.available_years, year]);

  const periodLabel = month === 'all'
    ? `Year ${year}`
    : `${MONTHS.find((m) => m.value === String(month))?.label || month} ${year}`;

  const salesLabels = useMemo(() => (reportType === 'sales' ? items.map((r) => r.label) : []), [items, reportType]);
  const salesRevenue = useMemo(() => (reportType === 'sales' ? items.map((r) => Number(r.revenue || 0)) : []), [items, reportType]);

  const columns = useMemo(() => {
    if (reportType === 'sales') {
      return [
        { key: 'key', label: 'Period' },
        { key: 'label', label: 'Label' },
        { key: 'orders', label: 'Placed', render: (r) => formatNumber(r.orders) },
        { key: 'paid_orders', label: 'Paid', render: (r) => formatNumber(r.paid_orders) },
        { key: 'revenue', label: 'Paid revenue', render: (r) => formatCurrency(r.revenue) },
      ];
    }
    if (reportType === 'products') {
      return [
        {
          key: 'name',
          label: 'Product',
          render: (r) => (
            <Link to={`/products/${r.id}/edit`} className="text-decoration-none text-dark">
              {r.name}
            </Link>
          ),
        },
        { key: 'sku', label: 'SKU' },
        { key: 'units_sold', label: 'Units', render: (r) => formatNumber(r.units_sold) },
        { key: 'orders', label: 'Orders', render: (r) => formatNumber(r.orders) },
        { key: 'revenue', label: 'Revenue', render: (r) => formatCurrency(r.revenue) },
      ];
    }
    return [
      {
        key: 'name',
        label: 'Customer',
        render: (r) => (
          <Link to={`/customers/${r.id}`} className="text-decoration-none text-dark">
            {r.name}
          </Link>
        ),
      },
      { key: 'email', label: 'Email' },
      { key: 'orders', label: 'Paid orders', render: (r) => formatNumber(r.orders) },
      { key: 'total_spent', label: 'Spent', render: (r) => formatCurrency(r.total_spent) },
      { key: 'avg_order_value', label: 'AOV', render: (r) => formatCurrency(r.avg_order_value) },
      { key: 'last_order_at', label: 'Last order', render: (r) => formatDateTime(r.last_order_at) },
    ];
  }, [reportType]);

  const exportColumns = columns.map((c) => ({ key: c.key, label: c.label }));
  const exportData = items.map((row) => {
    const copy = { ...row };
    if (reportType === 'sales') {
      copy.key = row.key;
    }
    return copy;
  });

  return (
    <>
      {!embedded ? (
        <>
          <Helmet><title>Reports — YULO Admin</title></Helmet>
          <PageHeader
            title="Reports"
            subtitle={`Accurate paid-order reports · ${periodLabel}`}
            actions={
              <div className="d-flex gap-2 flex-wrap align-items-center">
                <select
                  className="form-select form-select-sm"
                  style={{ width: 120 }}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  aria-label="Year"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  className="form-select form-select-sm"
                  style={{ width: 160 }}
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  aria-label="Month"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <ExportButtons
                  data={exportData}
                  columns={exportColumns}
                  filename={`yulo-${reportType}-${year}-${month}`}
                  title={`${reportType} Report · ${periodLabel}`}
                />
              </div>
            }
          />
        </>
      ) : (
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
          <p className="text-muted mb-0 small">Accurate paid-order reports · {periodLabel}</p>
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <select
              className="form-select form-select-sm"
              style={{ width: 120 }}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label="Year"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              className="form-select form-select-sm"
              style={{ width: 160 }}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label="Month"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <ExportButtons
              data={exportData}
              columns={exportColumns}
              filename={`yulo-${reportType}-${year}-${month}`}
              title={`${reportType} Report · ${periodLabel}`}
            />
          </div>
        </div>
      )}

      <div className="yulo-doc-cats mb-4">
        {REPORT_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`yulo-doc-cat ${reportType === t.key ? 'is-active' : ''}`}
            onClick={() => setReportType(t.key)}
          >
            <i className={`bi ${t.icon}`} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {loading && !payload ? (
        <Loader />
      ) : (
        <>
          {reportType === 'sales' ? (
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <StatCard icon="bi-currency-rupee" label="Paid Revenue" value={formatCurrency(summary.revenue)} accent="gold" />
              </div>
              <div className="col-md-3">
                <StatCard icon="bi-bag-check" label="Paid Orders" value={formatNumber(summary.paid_orders)} accent="dark" />
              </div>
              <div className="col-md-3">
                <StatCard icon="bi-bag" label="Placed Orders" value={formatNumber(summary.orders)} accent="gold" />
              </div>
              <div className="col-md-3">
                <StatCard icon="bi-receipt" label="Avg Order Value" value={formatCurrency(summary.avg_order_value)} accent="dark" />
              </div>
            </div>
          ) : null}

          {reportType === 'products' ? (
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <StatCard icon="bi-box-seam" label="Products Sold" value={formatNumber(summary.products)} accent="dark" />
              </div>
              <div className="col-md-4">
                <StatCard icon="bi-stack" label="Units Sold" value={formatNumber(summary.units_sold)} accent="gold" />
              </div>
              <div className="col-md-4">
                <StatCard icon="bi-currency-rupee" label="Product Revenue" value={formatCurrency(summary.revenue)} accent="dark" />
              </div>
            </div>
          ) : null}

          {reportType === 'customers' ? (
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <StatCard icon="bi-people" label="Paying Customers" value={formatNumber(summary.customers)} accent="dark" />
              </div>
              <div className="col-md-3">
                <StatCard icon="bi-person-plus" label="New Customers" value={formatNumber(summary.new_customers)} accent="gold" />
              </div>
              <div className="col-md-3">
                <StatCard icon="bi-bag-check" label="Paid Orders" value={formatNumber(summary.orders)} accent="dark" />
              </div>
              <div className="col-md-3">
                <StatCard icon="bi-wallet2" label="Avg Spend" value={formatCurrency(summary.avg_spend)} accent="gold" />
              </div>
            </div>
          ) : null}

          {reportType === 'sales' ? (
            <div className="yulo-card mb-4">
              <div className="yulo-card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h5 className="mb-0">Sales wave</h5>
                <span className="small text-muted">
                  {payload?.granularity === 'day' ? 'Daily' : 'Monthly'} paid revenue
                </span>
              </div>
              <div className="yulo-card-body">
                {items.length ? (
                  <WaveChart
                    currency
                    labels={salesLabels}
                    datasets={[
                      {
                        label: 'Paid revenue',
                        data: salesRevenue,
                        borderColor: '#111111',
                        backgroundColor: 'rgba(17, 17, 17, 0.12)',
                      },
                    ]}
                  />
                ) : (
                  <div className="yulo-empty">No sales in this period</div>
                )}
              </div>
            </div>
          ) : null}

          <div className="yulo-card">
            <div className="yulo-card-header">
              <h5 className="mb-0">
                {reportType === 'sales' && 'Sales breakdown'}
                {reportType === 'products' && 'Top products (paid orders)'}
                {reportType === 'customers' && 'Top customers (paid orders)'}
              </h5>
            </div>
            <div className="yulo-card-body p-0">
              {loading ? (
                <div className="p-4"><Loader /></div>
              ) : (
                <DataTable columns={columns} data={items} emptyMessage="No report data for selected filters." />
              )}
            </div>
          </div>

          {reportType === 'sales' && summary.orders != null && summary.orders !== summary.paid_orders ? (
            <p className="small text-muted mt-3 mb-0">
              Placed orders include unpaid checkouts. Revenue and AOV use paid orders only · Period start {formatDate(payload?.from)}.
            </p>
          ) : null}
        </>
      )}
    </>
  );
};

export default Reports;
