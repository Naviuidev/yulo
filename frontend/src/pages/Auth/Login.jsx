import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import LoginForm from '../../components/forms/LoginForm';

export default function Login() {
  return (
    <>
      <SEO title="Sign In" />
      <div className="container py-5" style={{ maxWidth: 480 }}>
        <Breadcrumb items={[{ label: 'Sign In' }]} />
        <h1 className="h3 fw-semibold mb-4 text-uppercase">Sign In</h1>
        <LoginForm />
      </div>
    </>
  );
}
