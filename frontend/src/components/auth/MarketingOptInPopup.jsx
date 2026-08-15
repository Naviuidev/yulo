import { useState } from 'react';
import Button from '../ui/Button';

/**
 * Shown after successful signup / email verification.
 * Default: opted in to receive promotions.
 */
export default function MarketingOptInPopup({ open, onConfirm, saving = false }) {
  const [optIn, setOptIn] = useState(true);

  if (!open) return null;

  return (
    <div className="marketing-optin-popup" role="dialog" aria-modal="true" aria-labelledby="marketing-optin-title">
      <div className="marketing-optin-popup__backdrop" />
      <div className="marketing-optin-popup__card">
        <p className="marketing-optin-popup__eyebrow">Welcome to YULO</p>
        <h2 id="marketing-optin-title" className="marketing-optin-popup__title">
          Stay in the loop
        </h2>
        <p className="marketing-optin-popup__text">
          Get exclusive offers, new drops, and campaign updates by email. You can change this anytime in
          Profile → Permissions.
        </p>

        <label className="marketing-optin-popup__choice">
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
          />
          <span>
            <strong>Opt in</strong> to receive promotions, news, and campaigns by email.
            Uncheck to opt out — you can still shop and manage your account normally.
          </span>
        </label>

        <Button
          type="button"
          className="w-100"
          loading={saving}
          onClick={() => onConfirm(optIn)}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
