import { Link } from 'react-router-dom';
import SEO from '../../components/common/SEO';
import Button from '../../components/ui/Button';

export default function NotFound() {
  return (
    <>
      <SEO title="Page Not Found" />
      <div className="container text-center py-5" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 className="display-1 fw-bold">404</h1>
        <div className="gold-line" />
        <p className="text-muted mb-4">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link to="/"><Button>Back to Home</Button></Link>
      </div>
    </>
  );
}
