import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import ContactForm from '../../components/forms/ContactForm';

export default function Contact() {
  return (
    <>
      <SEO title="Contact Us" description="Get in touch with the YULO team." />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: 'Contact' }]} />
          <h1>Contact Us</h1>
        </div>
      </div>

      <div className="container py-5">
        <div className="row g-5">
          <div className="col-lg-5">
            <h5 className="text-uppercase small fw-semibold mb-4">Get in Touch</h5>
            <p className="text-muted mb-4">We&apos;d love to hear from you. Our team typically responds within 24 hours.</p>
            <div className="d-flex flex-column gap-3">
              <div><i className="bi bi-envelope me-2" /> support@yulo.com</div>
              <div><i className="bi bi-telephone me-2" /> +91 98765 43210</div>
              <div><i className="bi bi-geo-alt me-2" /> Mumbai, India</div>
            </div>
          </div>
          <div className="col-lg-7">
            <ContactForm />
          </div>
        </div>
      </div>
    </>
  );
}
