import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { resolveMediaUrl } from '../../utils/helpers';

const STORAGE_KEY = 'yulo_offer_popup_seen';

export default function OfferPopup() {
  const [card, setCard] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get('/offer-card');
        const row = data?.data;
        if (cancelled || !row?.image) return;

        const seen = sessionStorage.getItem(STORAGE_KEY);
        // Show once per session until closed; re-show if admin replaces the card id
        if (seen && String(seen) === String(row.id)) return;

        setCard(row);
        setOpen(true);
      } catch {
        // No popup
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const close = () => {
    if (card?.id) {
      sessionStorage.setItem(STORAGE_KEY, String(card.id));
    }
    setOpen(false);
  };

  if (!open || !card) return null;

  const imageSrc = resolveMediaUrl(card.image);
  const href = card.link || '';
  const isExternal = /^https?:\/\//i.test(href);

  const image = <img src={imageSrc} alt={card.title || 'Special offer'} className="offer-popup__img" />;

  return (
    <div className="offer-popup" role="dialog" aria-modal="true" aria-label="Special offer">
      <button type="button" className="offer-popup__backdrop" aria-label="Close offer" onClick={close} />
      <div className="offer-popup__card">
        <button type="button" className="offer-popup__close" onClick={close} aria-label="Close">
          <i className="bi bi-x-lg" />
        </button>
        {href ? (
          isExternal ? (
            <a href={href} target="_blank" rel="noopener noreferrer" onClick={close}>
              {image}
            </a>
          ) : (
            <Link to={href} onClick={close}>
              {image}
            </Link>
          )
        ) : (
          image
        )}
      </div>
    </div>
  );
}
