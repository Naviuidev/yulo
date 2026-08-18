import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import orderService from '../../services/orderService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';

const RETURN_STATUS_LABELS = {
  requested: 'Requested',
  in_process: 'In process',
  completed: 'Completed',
  rejected: 'Rejected',
};

const Orders = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [returnStatus, setReturnStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [returnDetail, setReturnDetail] = useState(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [notifyReturnEmail, setNotifyReturnEmail] = useState(true);
  const [markRefunded, setMarkRefunded] = useState(false);
  const [updatingReturn, setUpdatingReturn] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 15 };
      if (status) params.status = status;
      if (returnStatus) params.return_status = returnStatus;
      const { items, pagination: pag } = await orderService.list(params);
      setOrders(items);
      setPagination(pag);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [page, status, returnStatus]);

  const openReturnDetail = (e, row) => {
    e.stopPropagation();
    if (!row?.return) return;
    setReturnDetail(row);
    setReturnNotes(row.return.admin_notes || '');
    setNotifyReturnEmail(true);
    setMarkRefunded(false);
  };

  const closeReturnDetail = () => {
    if (updatingReturn) return;
    setReturnDetail(null);
  };

  const handleReturnUpdate = async (nextStatus) => {
    if (!returnDetail?.return || updatingReturn) return;
    setUpdatingReturn(true);
    try {
      const result = await orderService.updateReturn(returnDetail.id, {
        status: nextStatus,
        admin_notes: returnNotes.trim() || undefined,
        notify_customer: notifyReturnEmail,
        mark_order_returned: true,
        mark_refunded: nextStatus === 'completed' ? markRefunded : false,
      });
      toast.success(
        nextStatus === 'completed'
          ? 'Return completed'
          : nextStatus === 'rejected'
            ? 'Return rejected'
            : 'Return updated'
      );
      if (notifyReturnEmail) {
        if (result?.email_sent) toast.success(result.email_message || 'Customer notified');
        else toast.info(result?.email_message || 'Updated, but email was not sent');
      }
      setReturnDetail(null);
      await fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update return');
    } finally {
      setUpdatingReturn(false);
    }
  };

  const columns = [
    { key: 'order_number', label: 'Order #' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'customer_email', label: 'Email' },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'payment_status', label: 'Payment', render: (r) => <StatusBadge status={r.payment_status} /> },
    {
      key: 'payment_method',
      label: 'MOP',
      render: (r) => {
        const method = String(r.payment_method || '').toLowerCase();
        const mode = method === 'cod' ? 'COD' : method ? 'Prepaid' : '—';
        if (mode === '—') return <span className="text-muted">—</span>;
        return (
          <span className="btn btn-dark btn-sm rounded-pill py-0 px-3" style={{ pointerEvents: 'none' }}>
            {mode}
          </span>
        );
      },
    },
    {
      key: 'return',
      label: 'Return',
      render: (r) => {
        if (!r.return) {
          return <span className="text-muted">—</span>;
        }
        if (!r.has_open_return) {
          return (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary rounded-pill"
              onClick={(e) => openReturnDetail(e, r)}
            >
              Return history
            </button>
          );
        }
        return (
          <button
            type="button"
            className="btn btn-sm btn-dark rounded-pill"
            onClick={(e) => openReturnDetail(e, r)}
          >
            Return
          </button>
        );
      },
    },
    { key: 'created_at', label: 'Date', render: (r) => formatDateTime(r.created_at) },
  ];

  const ret = returnDetail?.return;
  const open = Boolean(returnDetail?.has_open_return);

  return (
    <>
      <Helmet><title>Orders — YULO Admin</title></Helmet>
      <PageHeader title="Orders" subtitle="Manage and track customer orders" />

      <div className="mb-3 d-flex flex-wrap gap-2">
        <select
          className="form-select form-select-sm"
          style={{ width: 200 }}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          className="form-select form-select-sm"
          style={{ width: 200 }}
          value={returnStatus}
          onChange={(e) => { setReturnStatus(e.target.value); setPage(1); }}
        >
          <option value="">All returns</option>
          <option value="in_process">Return in process</option>
          <option value="requested">Return requested</option>
          <option value="completed">Return completed</option>
          <option value="rejected">Return rejected</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        onRowClick={(row) => navigate(`/orders/${row.id}`)}
        emptyMessage="No orders found."
      />

      {pagination.total_pages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button className="btn btn-sm btn-outline-dark" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="align-self-center small text-muted">Page {page} of {pagination.total_pages}</span>
          <button className="btn btn-sm btn-outline-dark" disabled={page >= pagination.total_pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}

      <ConfirmModal
        show={Boolean(returnDetail)}
        title={open ? 'Return in process' : 'Return details'}
        message={
          returnDetail
            ? `Return for order ${returnDetail.order_number}.`
            : ''
        }
        confirmLabel="Open order"
        cancelLabel="Close"
        variant="dark"
        confirmDisabled={updatingReturn}
        onConfirm={() => {
          const orderId = returnDetail?.id;
          setReturnDetail(null);
          if (orderId) navigate(`/orders/${orderId}`);
        }}
        onCancel={closeReturnDetail}
      >
        {ret ? (
          <div className="mt-3 pt-3 border-top small">
            <dl className="row mb-0">
              <dt className="col-4 text-muted">Status</dt>
              <dd className="col-8">
                <span className="btn btn-dark btn-sm rounded-pill py-0 px-3" style={{ pointerEvents: 'none' }}>
                  {RETURN_STATUS_LABELS[ret.status] || ret.status}
                </span>
              </dd>
              <dt className="col-4 text-muted">Requested</dt>
              <dd className="col-8">{formatDateTime(ret.created_at)}</dd>
              <dt className="col-4 text-muted">Customer</dt>
              <dd className="col-8">
                {returnDetail.customer_name}
                {returnDetail.customer_email ? (
                  <div className="text-muted">{returnDetail.customer_email}</div>
                ) : null}
              </dd>
              <dt className="col-4 text-muted">Reason</dt>
              <dd className="col-8">{ret.reason || '— (no reason provided)'}</dd>
            </dl>

            {open ? (
              <div className="mt-3">
                <label className="form-label" htmlFor="list-return-notes">
                  Admin notes
                </label>
                <textarea
                  id="list-return-notes"
                  className="form-control form-control-sm mb-2"
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  disabled={updatingReturn}
                />
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="list-notify-return"
                    checked={notifyReturnEmail}
                    onChange={(e) => setNotifyReturnEmail(e.target.checked)}
                    disabled={updatingReturn}
                  />
                  <label className="form-check-label" htmlFor="list-notify-return">
                    Email customer
                  </label>
                </div>
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="list-mark-refunded"
                    checked={markRefunded}
                    onChange={(e) => setMarkRefunded(e.target.checked)}
                    disabled={updatingReturn}
                  />
                  <label className="form-check-label" htmlFor="list-mark-refunded">
                    On complete: mark payment refunded
                  </label>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-dark"
                    disabled={updatingReturn}
                    onClick={() => handleReturnUpdate('in_process')}
                  >
                    Save notes
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    disabled={updatingReturn}
                    onClick={() => handleReturnUpdate('rejected')}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-dark"
                    disabled={updatingReturn}
                    onClick={() => handleReturnUpdate('completed')}
                  >
                    Complete return
                  </button>
                </div>
              </div>
            ) : ret.admin_notes ? (
              <p className="mb-0 mt-3">
                <strong>Admin notes:</strong> {ret.admin_notes}
              </p>
            ) : null}
          </div>
        ) : null}
      </ConfirmModal>
    </>
  );
};

export default Orders;
