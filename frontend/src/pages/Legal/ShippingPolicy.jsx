import { Link } from 'react-router-dom';
import LegalPage, { LegalSection } from '../../components/legal/LegalPage';
import { BRAND_NAME } from '../../utils/constants';

export default function ShippingPolicy() {
  return (
    <LegalPage
      title="Shipping Policy"
      description={`${BRAND_NAME} shipping policy — delivery timelines, charges, and tracking across India.`}
    >
      <LegalSection title="1. Service area">
        <p>
          We currently ship across India. International shipping is not available yet. Some remote
          pincodes may have longer delivery times or limited COD options depending on our courier
          partners.
        </p>
      </LegalSection>

      <LegalSection title="2. Shipping charges">
        <p>
          Standard cart shipping is <strong>free on orders of ₹999 and above</strong>. Below ₹999, a
          shipping fee of <strong>₹99</strong> usually applies. Individual products may use a custom
          shipping charge set by us — that amount is shown at checkout when applicable.
        </p>
      </LegalSection>

      <LegalSection title="3. Processing & delivery">
        <ul className="mb-0 ps-3">
          <li className="mb-2">
            Orders are typically processed within 1–2 business days after confirmation (and payment,
            for prepaid orders).
          </li>
          <li className="mb-2">
            Estimated delivery is usually 3–7 business days after dispatch, depending on your location
            and courier capacity.
          </li>
          <li>
            Delays may occur during sales, festivals, weather events, or courier disruptions.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Order tracking">
        <p>
          Once your order is shipped and a tracking number is shared, you can track it from{' '}
          <Link to="/track-order">Track Order</Link> or your{' '}
          <Link to="/profile?section=orders">My Orders</Link> page.
        </p>
      </LegalSection>

      <LegalSection title="5. Cash on Delivery (COD)">
        <p>
          COD is available only when every product in your cart allows COD. Please keep the exact
          order amount ready at delivery. Failed delivery attempts due to wrong address or
          unavailable recipient may incur reattempt or return-to-origin handling.
        </p>
      </LegalSection>

      <LegalSection title="6. Address accuracy">
        <p>
          You are responsible for providing a complete and correct delivery address and phone number.
          Orders returned due to incorrect details may be subject to additional shipping charges on
          reshipment.
        </p>
      </LegalSection>

      <LegalSection title="7. Need help?">
        <p>
          For shipping questions, use the <Link to="/contact">Contact</Link> page or raise a tracking
          query from your order details when tracking is not yet available.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
