import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import marketingService from '../../services/marketingService';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { resolveMediaUrl } from '../../utils/media';

const TABS = [
  { id: 'users', label: 'Users', icon: 'bi-person-plus' },
  { id: 'customers', label: 'Customers', icon: 'bi-bag-check' },
  { id: 'subscribed', label: 'Subscribed Users', icon: 'bi-envelope-check' },
  { id: 'digital', label: 'Digital Marketing', icon: 'bi-broadcast-pin' },
  { id: 'campaigns', label: 'Campaigns', icon: 'bi-megaphone' },
];

const DIGITAL_CARDS = [
  {
    id: 'one_to_one',
    title: 'One to one promotion mail',
    desc: 'Send a tailored promotion to selected users, customers, or subscribers.',
    icon: 'bi-person-lines-fill',
  },
  {
    id: 'bulk',
    title: 'Bulk mail marketing',
    desc: 'Broadcast the same promotion to many users, customers, or subscribers.',
    icon: 'bi-envelope-paper',
  },
];

const EMPTY_PROMO = {
  heading: '',
  description: '',
  banner_image: '',
  product_link: '',
  actual_price: '',
  offer_price: '',
};

function PeopleTable({ type }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const isCustomers = type === 'customers';

  useEffect(() => {
    setPage(1);
    setSearch('');
  }, [type]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = { page, per_page: 15, type };
        if (search) params.search = search;
        const { items, pagination: pag } = await marketingService.users(params);
        if (!cancelled) {
          setRows(items);
          setPagination(pag);
        }
      } catch {
        if (!cancelled) {
          setRows([]);
          setPagination({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [page, search, type]);

  const columns = isCustomers
    ? [
        { key: 'name', label: 'Name', render: (r) => r.name || '—' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
        { key: 'order_count', label: 'Orders', render: (r) => r.order_count ?? 0 },
        { key: 'total_spent', label: 'Total Spent', render: (r) => formatCurrency(r.total_spent) },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'created_at', label: 'Joined', render: (r) => formatDate(r.created_at) },
      ]
    : [
        { key: 'name', label: 'Name', render: (r) => r.name || '—' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
        { key: 'order_count', label: 'Orders', render: (r) => r.order_count ?? 0 },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'created_at', label: 'Signed up', render: (r) => formatDate(r.created_at) },
      ];

  return (
    <div>
      <p className="small text-muted mb-3">
        {isCustomers
          ? 'Customers who ordered and opted in to receive promotions.'
          : 'Signup users who opted in to receive promotions.'}
      </p>
      <div className="mb-3">
        <input
          type="search"
          className="form-control form-control-sm"
          style={{ maxWidth: 320 }}
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <DataTable columns={columns} data={rows} loading={loading} />
      {pagination.total_pages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button type="button" className="btn btn-sm btn-outline-dark rounded-pill px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="align-self-center small">Page {page} of {pagination.total_pages}</span>
          <button type="button" className="btn btn-sm btn-outline-dark rounded-pill px-3" disabled={page >= pagination.total_pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function SubscribersTable() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = { page, per_page: 15 };
        if (search) params.search = search;
        const { items, pagination: pag } = await marketingService.subscribers(params);
        if (!cancelled) {
          setRows(items);
          setPagination(pag);
        }
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [page, search]);

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'subscribed_at', label: 'Subscribed', render: (r) => formatDate(r.subscribed_at) },
  ];

  return (
    <div>
      <p className="small text-muted mb-3">
        Saved from the storefront homepage newsletter form.
      </p>
      <div className="mb-3">
        <input
          type="search"
          className="form-control form-control-sm"
          style={{ maxWidth: 320 }}
          placeholder="Search email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <DataTable columns={columns} data={rows} loading={loading} />
      {pagination.total_pages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button type="button" className="btn btn-sm btn-outline-dark rounded-pill px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="align-self-center small">Page {page} of {pagination.total_pages}</span>
          <button type="button" className="btn btn-sm btn-outline-dark rounded-pill px-3" disabled={page >= pagination.total_pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function PromotionComposer({ mode, onBack }) {
  const [promo, setPromo] = useState(EMPTY_PROMO);
  const [audienceType, setAudienceType] = useState('users');
  const [audience, setAudience] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [audienceSearch, setAudienceSearch] = useState('');

  const isOneToOne = mode === 'one_to_one';

  const loadAudience = useCallback(async (type) => {
    setLoadingAudience(true);
    try {
      const rows = await marketingService.audience(type);
      setAudience(Array.isArray(rows) ? rows : []);
      setSelectedIds([]);
      setAudienceSearch('');
    } catch {
      setAudience([]);
      toast.error('Could not load audience list');
    } finally {
      setLoadingAudience(false);
    }
  }, []);

  useEffect(() => {
    loadAudience(audienceType);
  }, [audienceType, loadAudience]);

  const filteredAudience = useMemo(() => {
    const q = audienceSearch.trim().toLowerCase();
    if (!q) return audience;
    return audience.filter(
      (r) =>
        String(r.name || '').toLowerCase().includes(q) ||
        String(r.email || '').toLowerCase().includes(q) ||
        String(r.phone || '').toLowerCase().includes(q)
    );
  }, [audience, audienceSearch]);

  const setField = (key, value) => setPromo((p) => ({ ...p, [key]: value }));

  const onBanner = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const res = await marketingService.uploadBanner(file);
      setField('banner_image', res.path || res.url || '');
      toast.success('Banner uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Banner upload failed');
    } finally {
      setUploading(false);
    }
  };

  const toggleId = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllFiltered = () => {
    setSelectedIds(filteredAudience.map((r) => r.id));
  };

  const clearSelection = () => setSelectedIds([]);

  const onShare = async () => {
    if (!promo.heading.trim()) {
      toast.error('Heading is required');
      return;
    }
    if (!promo.banner_image) {
      toast.error('Banner image is required');
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('Select at least one recipient');
      return;
    }
    if (isOneToOne && selectedIds.length > 25) {
      toast.error('One-to-one allows up to 25 recipients');
      return;
    }
    setSending(true);
    try {
      await marketingService.sendPromotion({
        ...promo,
        audience_type: audienceType,
        mode,
        recipient_ids: selectedIds,
      });
      toast.success('Promotion shared');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send promotion');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <button type="button" className="btn btn-link btn-sm text-decoration-none px-0 mb-3" onClick={onBack}>
        ← Back
      </button>
      <h2 className="h5 mb-4">{isOneToOne ? 'One to one promotion mail' : 'Bulk mail marketing'}</h2>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="mb-3">
            <label className="form-label small text-uppercase fw-medium">Heading</label>
            <input
              type="text"
              className="form-control"
              value={promo.heading}
              onChange={(e) => setField('heading', e.target.value)}
              placeholder="Promotion title"
            />
          </div>
          <div className="mb-3">
            <label className="form-label small text-uppercase fw-medium">Banner image</label>
            <input type="file" className="form-control" accept="image/*" onChange={onBanner} disabled={uploading} />
            {promo.banner_image ? (
              <img
                src={resolveMediaUrl(promo.banner_image)}
                alt=""
                className="yulo-marketing-banner-preview mt-2"
              />
            ) : null}
          </div>
          <div className="mb-3">
            <label className="form-label small text-uppercase fw-medium">Product link</label>
            <input
              type="text"
              className="form-control"
              value={promo.product_link}
              onChange={(e) => setField('product_link', e.target.value)}
              placeholder="/shop or full URL"
            />
          </div>
          <div className="mb-3">
            <label className="form-label small text-uppercase fw-medium">Description</label>
            <textarea
              className="form-control"
              rows={4}
              value={promo.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Short promotion copy"
            />
          </div>
          <div className="row g-3">
            <div className="col-sm-6">
              <label className="form-label small text-uppercase fw-medium">Actual price</label>
              <input
                type="text"
                className="form-control"
                value={promo.actual_price}
                onChange={(e) => setField('actual_price', e.target.value)}
                placeholder="1499"
              />
            </div>
            <div className="col-sm-6">
              <label className="form-label small text-uppercase fw-medium">Offer price</label>
              <input
                type="text"
                className="form-control"
                value={promo.offer_price}
                onChange={(e) => setField('offer_price', e.target.value)}
                placeholder="999"
              />
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <label className="form-label small text-uppercase fw-medium">Audience</label>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              className={`yulo-marketing-badge ${audienceType === 'users' ? 'is-active' : ''}`}
              onClick={() => setAudienceType('users')}
            >
              <i className="bi bi-person-plus me-1" aria-hidden="true" />
              Users
            </button>
            <button
              type="button"
              className={`yulo-marketing-badge ${audienceType === 'customers' ? 'is-active' : ''}`}
              onClick={() => setAudienceType('customers')}
            >
              <i className="bi bi-bag-check me-1" aria-hidden="true" />
              Customers
            </button>
            <button
              type="button"
              className={`yulo-marketing-badge ${audienceType === 'subscribed' ? 'is-active' : ''}`}
              onClick={() => setAudienceType('subscribed')}
            >
              <i className="bi bi-envelope-check me-1" aria-hidden="true" />
              Subscribed users
            </button>
          </div>

          <div className="d-flex flex-wrap gap-2 mb-2">
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Filter recipients…"
              value={audienceSearch}
              onChange={(e) => setAudienceSearch(e.target.value)}
            />
            <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={selectAllFiltered}>
              Select all
            </button>
            <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={clearSelection}>
              Clear
            </button>
          </div>

          <div className="yulo-marketing-recipients">
            {loadingAudience ? (
              <p className="small text-muted mb-0 p-3">Loading…</p>
            ) : filteredAudience.length === 0 ? (
              <p className="small text-muted mb-0 p-3">No recipients found.</p>
            ) : (
              filteredAudience.map((row) => (
                <label key={row.id} className="yulo-marketing-recipient">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(row.id)}
                    onChange={() => toggleId(row.id)}
                  />
                  <span>
                    <strong>{row.name || row.email}</strong>
                    {row.name && row.email ? <em>{row.email}</em> : null}
                  </span>
                </label>
              ))
            )}
          </div>

          <p className="small text-muted mt-2 mb-3">
            {selectedIds.length} selected
            {isOneToOne ? ' · one-to-one (up to 25)' : ' · bulk (up to 200)'}
          </p>

          <button
            type="button"
            className="btn btn-dark rounded-pill px-4"
            disabled={sending || uploading}
            onClick={onShare}
          >
            <i className="bi bi-send me-1" aria-hidden="true" />
            {sending ? 'Sharing…' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignsTable() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = { page, per_page: 15 };
        if (search) params.search = search;
        const { items, pagination: pag } = await marketingService.campaigns(params);
        if (!cancelled) {
          setRows(items);
          setPagination(pag);
        }
      } catch {
        if (!cancelled) {
          setRows([]);
          setPagination({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [page, search]);

  const modeLabel = (m) => (m === 'bulk' ? 'Bulk' : 'One to one');
  const audienceLabel = (a) => {
    if (a === 'customers') return 'Customers';
    if (a === 'subscribed') return 'Subscribed';
    return 'Users';
  };

  const columns = [
    {
      key: 'banner_image',
      label: 'Banner',
      render: (r) =>
        r.banner_image ? (
          <img
            src={resolveMediaUrl(r.banner_image)}
            alt=""
            style={{ width: 56, height: 36, objectFit: 'cover', borderRadius: 4 }}
          />
        ) : (
          '—'
        ),
    },
    { key: 'heading', label: 'Campaign', render: (r) => r.heading || '—' },
    { key: 'mode', label: 'Mode', render: (r) => modeLabel(r.mode) },
    { key: 'audience_type', label: 'Audience', render: (r) => audienceLabel(r.audience_type) },
    { key: 'recipient_count', label: 'Recipients', render: (r) => r.recipient_count ?? 0 },
    { key: 'sent_count', label: 'Sent', render: (r) => r.sent_count ?? 0 },
    { key: 'failed_count', label: 'Failed', render: (r) => r.failed_count ?? 0 },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'triggered_by_name',
      label: 'Triggered by',
      render: (r) => r.triggered_by_name || '—',
    },
    {
      key: 'created_at',
      label: 'Triggered at',
      render: (r) => formatDateTime(r.created_at),
    },
  ];

  return (
    <div>
      <p className="small text-muted mb-3">
        Campaigns triggered from Digital Marketing (one-to-one and bulk promotion mail).
      </p>
      <div className="mb-3">
        <input
          type="search"
          className="form-control form-control-sm"
          style={{ maxWidth: 320 }}
          placeholder="Search campaign, audience or mode…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <DataTable columns={columns} data={rows} loading={loading} emptyMessage="No campaigns triggered yet." />
      {pagination.total_pages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button type="button" className="btn btn-sm btn-outline-dark rounded-pill px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="align-self-center small">Page {page} of {pagination.total_pages}</span>
          <button type="button" className="btn btn-sm btn-outline-dark rounded-pill px-3" disabled={page >= pagination.total_pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function DigitalMarketingPanel() {
  const [mode, setMode] = useState(null);

  if (mode) {
    return <PromotionComposer mode={mode} onBack={() => setMode(null)} />;
  }

  return (
    <div className="yulo-marketing-cards">
      {DIGITAL_CARDS.map((card) => (
        <button
          key={card.id}
          type="button"
          className="yulo-marketing-card"
          onClick={() => setMode(card.id)}
        >
          <span className="yulo-marketing-card__icon" aria-hidden="true">
            <i className={`bi ${card.icon}`} />
          </span>
          <span className="yulo-marketing-card__body">
            <strong>{card.title}</strong>
            <em>{card.desc}</em>
          </span>
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export default function Marketing() {
  const [tab, setTab] = useState('users');

  return (
    <>
      <Helmet>
        <title>Marketing — YULO Admin</title>
      </Helmet>
      <PageHeader
        title="Marketing"
        subtitle="Users, customers, subscribers, digital mail, and triggered campaigns."
      />

      <div className="yulo-doc-cats mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`yulo-doc-cat ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`bi ${t.icon}`} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'users' && <PeopleTable type="users" />}
      {tab === 'customers' && <PeopleTable type="customers" />}
      {tab === 'subscribed' && <SubscribersTable />}
      {tab === 'digital' && <DigitalMarketingPanel />}
      {tab === 'campaigns' && <CampaignsTable />}
    </>
  );
}
