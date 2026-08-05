import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import RegisterForm from '../../components/forms/RegisterForm';

export default function Register() {
  return (
    <>
      <SEO title="Create Account" />
      <div className="container py-5" style={{ maxWidth: 480 }}>
        <Breadcrumb items={[{ label: 'Register' }]} />
        <h1 className="h3 fw-semibold mb-4 text-uppercase">Create Account</h1>
        <RegisterForm />
      </div>
    </>
  );
}
