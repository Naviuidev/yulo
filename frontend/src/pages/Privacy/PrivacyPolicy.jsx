import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import { BRAND_NAME } from '../../utils/constants';

export default function PrivacyPolicy() {
  return (
    <>
      <SEO
        title="Privacy Policy"
        description={`${BRAND_NAME} privacy policy — how we collect and use your information.`}
      />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: 'Privacy Policy' }]} />
          <h1>Privacy Policy</h1>
        </div>
      </div>

      <section className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <p className="text-muted mb-0" style={{ lineHeight: 1.8 }}>
              At {BRAND_NAME}, we collect only the personal information needed to process orders,
              manage your account, and improve your shopping experience — such as your name, contact
              details, delivery address, and payment-related data from our secure payment partners.
              We do not sell your information to third parties, and we use industry-standard safeguards
              to protect your data. By using our website, you agree to this policy; for any privacy
              questions, please contact us through the Contact page.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
