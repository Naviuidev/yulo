import { Link } from 'react-router-dom';
import LegalPage, { LegalSection } from '../../components/legal/LegalPage';
import { BRAND_NAME } from '../../utils/constants';

export default function ReturnsPolicy() {
  return (
    <LegalPage
      title="Returns & Refunds"
      description={`${BRAND_NAME} returns and refunds policy — damaged items, replacements, and refund timelines.`}
    >
      <LegalSection title="1. Our promise">
        <p>
          We want you to be happy with your purchase. If an item arrives damaged, defective, or
          incorrect, we will help with a replacement or refund as described below.
        </p>
      </LegalSection>

      <LegalSection title="2. What can be returned">
        <ul className="mb-0 ps-3">
          <li className="mb-2">
            Damaged, defective, or wrong items reported within <strong>7 days</strong> of delivery,
            with clear photos and your order number.
          </li>
          <li className="mb-2">
            Items must be unused, with original tags and packaging where applicable (unless the damage
            prevents this).
          </li>
          <li>
            Personalised, intimate, or hygiene-sensitive products may not be eligible unless they
            arrive damaged or defective.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. What is not eligible">
        <ul className="mb-0 ps-3">
          <li className="mb-2">Change-of-mind returns after successful delivery (unless we announce otherwise).</li>
          <li className="mb-2">Normal wear, misuse, or damage after delivery.</li>
          <li>Products marked as final sale / non-returnable on the product page.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. How to request a return">
        <p>
          Contact us via the <Link to="/contact">Contact</Link> page with your order number, product
          details, and photos of the issue. Our team will confirm eligibility and share the next
          steps (pickup or self-ship instructions).
        </p>
      </LegalSection>

      <LegalSection title="5. Replacements & refunds">
        <p>
          Eligible cases may be resolved with a replacement (subject to stock) or a refund to the
          original payment method for prepaid orders. COD refunds are typically issued via bank
          transfer / UPI after we receive your account details. Refund timelines depend on your bank
          or payment partner and usually complete within 5–10 business days after approval.
        </p>
      </LegalSection>

      <LegalSection title="6. Order cancellation">
        <p>
          Before dispatch, you may cancel eligible orders from{' '}
          <Link to="/profile?section=orders">My Orders</Link> when the products allow customer
          cancellation. Cancelled unpaid / COD orders restore stock automatically. Prepaid refunds
          after cancellation follow the refund process above.
        </p>
      </LegalSection>

      <LegalSection title="7. Contact">
        <p>
          For returns help, reach us through <Link to="/contact">Contact</Link>. Related policies:{' '}
          <Link to="/shipping-policy">Shipping</Link> · <Link to="/terms">Terms</Link> ·{' '}
          <Link to="/privacy-policy">Privacy</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
