import { Link } from 'react-router-dom';
import LegalPage, { LegalSection } from '../../components/legal/LegalPage';
import { BRAND_NAME } from '../../utils/constants';

export default function Terms() {
  return (
    <LegalPage
      title="Terms & Conditions"
      description={`${BRAND_NAME} terms and conditions for using our website and placing orders.`}
    >
      <LegalSection title="1. Agreement">
        <p>
          By browsing {BRAND_NAME}, creating an account, or placing an order, you agree to these Terms
          &amp; Conditions and our{' '}
          <Link to="/privacy-policy">Privacy Policy</Link>. If you do not agree, please do not use the
          site.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility">
        <p>
          You must be at least 18 years old (or have a parent/guardian’s consent) to purchase from us.
          You agree to provide accurate account and delivery details.
        </p>
      </LegalSection>

      <LegalSection title="3. Products & pricing">
        <p>
          Product images are for illustration; colours and finishes may vary slightly. Prices are in
          Indian Rupees (₹) and may include applicable GST where enabled on a product. We may change
          prices or withdraw products without prior notice. An order is confirmed only after we accept
          it (and, for prepaid orders, after successful payment).
        </p>
      </LegalSection>

      <LegalSection title="4. Orders & payment">
        <p>
          You may pay online through our published payment gateway, or by Cash on Delivery (COD) when
          every product in your cart allows COD. We reserve the right to cancel orders for stock
          issues, pricing errors, suspected fraud, or failed payment.
        </p>
      </LegalSection>

      <LegalSection title="5. Cancellation">
        <p>
          You may cancel an eligible order from your account while it is still pending or confirmed,
          and only when every product in that order allows customer cancellation. Once an order is
          processing, packed, or shipped, cancellation may not be available — contact us via the{' '}
          <Link to="/contact">Contact</Link> page for help.
        </p>
      </LegalSection>

      <LegalSection title="6. Shipping & returns">
        <p>
          Delivery timelines and charges are described in our{' '}
          <Link to="/shipping-policy">Shipping Policy</Link>. Returns and replacements are covered by
          our <Link to="/returns-policy">Returns &amp; Refunds Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection title="7. Intellectual property">
        <p>
          All content on this website — including logos, product photography, text, and design —
          belongs to {BRAND_NAME} or its licensors. You may not copy or reuse it without written
          permission.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitation of liability">
        <p>
          To the fullest extent permitted by law, {BRAND_NAME} is not liable for indirect or
          consequential losses arising from use of the site or products, except where required under
          applicable Indian consumer protection law.
        </p>
      </LegalSection>

      <LegalSection title="9. Governing law">
        <p>
          These terms are governed by the laws of India. Courts in India shall have exclusive
          jurisdiction, subject to mandatory consumer forum rights.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          Questions about these terms? Reach us through the <Link to="/contact">Contact</Link> page.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
