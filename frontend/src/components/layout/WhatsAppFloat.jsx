import { useEffect, useState } from 'react';
import api from '../../services/api';

/** Fixed WhatsApp chat button — driven by admin Configure WhatsApp settings. */
export default function WhatsAppFloat() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/whatsapp');
        if (!cancelled) setConfig(data?.data ?? null);
      } catch {
        if (!cancelled) setConfig({ enabled: false });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!config?.enabled || !config?.number) return null;

  const href = config.url
    || `https://wa.me/${config.number}${config.prefill ? `?text=${encodeURIComponent(config.prefill)}` : ''}`;
  const position = config.position === 'bottom-right' ? 'bottom-right' : 'bottom-left';
  const label = config.display_number || config.number;

  return (
    <a
      href={href}
      className={`yulo-whatsapp-float yulo-whatsapp-float--${position}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat on WhatsApp ${label}`}
      title={`WhatsApp ${label}`}
    >
      <i className="bi bi-whatsapp" aria-hidden="true" />
    </a>
  );
}
