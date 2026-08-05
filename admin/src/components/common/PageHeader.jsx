const PageHeader = ({ title, subtitle, actions, breadcrumbs }) => (
  <div className="yulo-page-header d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
    <div>
      {breadcrumbs && <nav className="yulo-breadcrumb small mb-1">{breadcrumbs}</nav>}
      <h1 className="yulo-page-title mb-0">{title}</h1>
      {subtitle && <p className="text-muted mb-0 mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="d-flex gap-2 flex-wrap">{actions}</div>}
  </div>
);

export default PageHeader;
