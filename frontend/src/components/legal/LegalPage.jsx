import SEO from '../common/SEO';
import Breadcrumb from '../common/Breadcrumb';

/**
 * Shared layout for storefront legal / policy pages.
 * @param {{ title: string, description: string, children: import('react').ReactNode, updated?: string }} props
 */
export default function LegalPage({ title, description, children, updated = '17 August 2026' }) {
  return (
    <>
      <SEO title={title} description={description} />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: title }]} />
          <h1>{title}</h1>
        </div>
      </div>

      <section className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <p className="small text-muted mb-4">Last updated: {updated}</p>
            <div className="yulo-legal" style={{ lineHeight: 1.8 }}>
              {children}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function LegalSection({ title, children }) {
  return (
    <section className="mb-4">
      <h2 className="h5 fw-semibold mb-2">{title}</h2>
      <div className="text-muted">{children}</div>
    </section>
  );
}
