import { useEffect, useState } from 'react';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import ContactForm from '../../components/forms/ContactForm';
import api from '../../services/api';

function formatWhatsAppDisplay(raw) {
  const digits = String(raw || '').replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return `+${digits}`;
}

export default function Contact() {
  const [whatsapp, setWhatsapp] = useState({
    enabled: true,
    number: '917799056684',
    display: '+91 77990 56684',
  });

  useEffect(() => {
    let cancelled = false;
    api
      .get('/whatsapp')
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        const digits = String(data?.number || data?.display_number || '').replace(/\D+/g, '') || '917799056684';
        setWhatsapp({
          enabled: data?.enabled !== false,
          number: digits,
          display: formatWhatsAppDisplay(digits) || '+91 77990 56684',
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const waLink = `https://wa.me/${whatsapp.number}`;

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
            <p className="text-muted mb-4">
              We&apos;d love to hear from you. Our team typically responds within 24 hours.
            </p>
            <div className="d-flex flex-column gap-3">
              <div>
                <i className="bi bi-envelope me-2" />
                <a href="mailto:helloyulowear@gmail.com" className="text-decoration-none text-dark">
                  helloyulowear@gmail.com
                </a>
              </div>
              {whatsapp.enabled !== false ? (
                <div>
                  <i className="bi bi-whatsapp me-2" />
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-decoration-none text-dark"
                  >
                    {whatsapp.display}
                  </a>
                </div>
              ) : null}
              <div>
                <i className="bi bi-geo-alt me-2" />
                52-99, Ayyappa Society, Madhapur, Hyderabad, Telangana 500008
              </div>
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
