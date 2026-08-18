import { Link } from 'react-router-dom';
import LegalPage, { LegalSection } from '../../components/legal/LegalPage';
import { BRAND_NAME } from '../../utils/constants';

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      description={`${BRAND_NAME} privacy policy — how we collect and use your information.`}
    >
      <LegalSection title="1. Information we collect">
        <p>
          At {BRAND_NAME}, we collect only the personal information needed to process orders, manage
          your account, and improve your shopping experience — such as your name, contact details,
          delivery address, and payment-related data from our secure payment partners.
        </p>
      </LegalSection>

      <LegalSection title="2. How we use it">
        <p>
          We use your information to fulfil orders, send order updates, provide customer support,
          improve the website, and (with your consent where required) share offers or newsletters.
        </p>
      </LegalSection>

      <LegalSection title="3. Sharing">
        <p>
          We do not sell your information to third parties. We may share data with trusted partners
          such as payment gateways, courier companies, and email service providers — only as needed
          to run the store.
        </p>
      </LegalSection>

      <LegalSection title="4. Security">
        <p>
          We use industry-standard safeguards to protect your data. No method of transmission over
          the internet is 100% secure; please keep your account password confidential.
        </p>
      </LegalSection>

      <LegalSection title="5. Your choices">
        <p>
          You may update your profile and addresses from your account. For access, correction, or
          deletion requests, contact us through the <Link to="/contact">Contact</Link> page.
        </p>
      </LegalSection>

      <LegalSection title="6. Related policies">
        <p>
          See also our <Link to="/terms">Terms &amp; Conditions</Link>,{' '}
          <Link to="/shipping-policy">Shipping Policy</Link>, and{' '}
          <Link to="/returns-policy">Returns &amp; Refunds</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
