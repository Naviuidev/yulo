import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/common/Loader';

/** Orders live under Profile → Orders. */
export default function Orders() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/profile?section=orders', { replace: true });
  }, [navigate]);

  return <Loader fullScreen />;
}
