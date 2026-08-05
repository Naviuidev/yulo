import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import ExportButtons from '../../components/common/ExportButtons';
import Loader from '../../components/common/Loader';
import reportService from '../../services/reportService';
import { formatCurrency } from '../../utils/formatters';

const REPORT_TYPES = [
  { key: 'sales', label: 'Sales Report', service: 'sales' },
  { key: 'products', label: 'Product Performance', service: 'products' },
  { key: 'customers', label: 'Customer Report', service: 'customers' },
];

const PERIODS = [
  { key: 'daily', days: 1, label: 'Daily' },
  { key: 'weekly', days: 7, label: 'Weekly' },
  { key: 'monthly', days: 30, label: 'Monthly' },
  { key: 'yearly', days: 365, label: 'Yearly' },
];

const Reports = () => {
  const [period, setPeriod] = useState('monthly');
  const [reportType, setReportType] = useState('sales');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const days = PERIODS.find((p) => p.key === period)?.days || 30;
        const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
        const to = new Date().toISOString().slice(0, 10);

        let result = [];
        if (reportType === 'sales') result = await reportService.sales({ from, to });
        else if (reportType === 'products') result = await reportService.products();
        else if (reportType === 'customers') result = await reportService.customers();
        setData(Array.isArray(result) ? result : []);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period, reportType]);

  const getColumns = () => {
    if (reportType === 'sales') {
      return [
        { key: 'date', label: 'Date' },
        { key: 'orders', label: 'Orders' },
        { key: 'revenue', label: 'Revenue', render: (r) => formatCurrency(r.revenue) },
      ];
    }
    if (reportType === 'products') {
      return [
        { key: 'name', label: 'Product' },
        { key: 'sku', label: 'SKU' },
        { key: 'units_sold', label: 'Units Sold' },
        { key: 'revenue', label: 'Revenue', render: (r) => formatCurrency(r.revenue) },
      ];
    }
    return [
      { key: 'name', label: 'Customer' },
      { key: 'email', label: 'Email' },
      { key: 'orders', label: 'Orders' },
      { key: 'total_spent', label: 'Total Spent', render: (r) => formatCurrency(r.total_spent) },
    ];
  };

  const columns = getColumns();
  const exportColumns = columns.map((c) => ({ key: c.key, label: c.label }));

  return (
    <>
      <Helmet><title>Reports — YULO Admin</title></Helmet>
      <PageHeader
        title="Reports"
        subtitle="Generate and export business reports"
        actions={<ExportButtons data={data} columns={exportColumns} filename={`yulo-${reportType}-${period}`} title={`${reportType} Report`} />}
      />

      <div className="d-flex flex-wrap gap-3 mb-4">
        <div>
          <label className="form-label small text-muted">Report Type</label>
          <select className="form-select form-select-sm" style={{ width: 200 }} value={reportType} onChange={(e) => setReportType(e.target.value)}>
            {REPORT_TYPES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
        {reportType === 'sales' && (
          <div>
            <label className="form-label small text-muted">Period</label>
            <select className="form-select form-select-sm" style={{ width: 140 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? <Loader /> : (
        <DataTable columns={columns} data={data} emptyMessage="No report data for selected filters." />
      )}
    </>
  );
};

export default Reports;
