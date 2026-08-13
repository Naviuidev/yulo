import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loader from '../../components/common/Loader';

/** Redirect standalone /orders/:id into Profile → Orders detail. */
export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/profile?section=orders&order=${encodeURIComponent(id)}`, { replace: true });
  }, [id, navigate]);

  return <Loader fullScreen />;
}
