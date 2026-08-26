import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import Loader from '../../components/common/Loader';
import YuloLogo from '../../components/common/YuloLogo';
import { navItemsForUser } from '../../utils/constants';

const LOGIN_HERO_IMG =
  'https://i.postimg.cc/yNs3B4gL/file-000000006b488208884958b1ad97d7fb.png';

function homePathForUser(user) {
  return navItemsForUser(user)[0]?.path || '/';
}

const Login = () => {
  const { login, user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const forceFresh = searchParams.get('fresh') === '1';
  const [clearingSession, setClearingSession] = useState(forceFresh);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { email: '', password: '' },
  });

  const from = location.state?.from?.pathname;

  useEffect(() => {
    if (!forceFresh) return undefined;

    let cancelled = false;
    (async () => {
      setClearingSession(true);
      try {
        await authService.logout();
      } catch {
        /* ignore */
      }
      if (!cancelled) {
        // Drop ?fresh=1 and clear in-memory auth with a clean login load
        window.location.replace(`${window.location.pathname}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [forceFresh]);

  if (authLoading || clearingSession) {
    return <Loader fullScreen text={clearingSession ? 'Preparing login…' : 'Loading...'} />;
  }

  if (isAuthenticated) {
    const dest = from && from !== '/login' ? from : homePathForUser(user);
    // Avoid bounce when staff has zero feature permissions.
    if (dest === '/login' || !navItemsForUser(user).length) {
      return (
        <Loader fullScreen text="No admin features assigned. Ask a master admin to approve access." />
      );
    }
    navigate(dest, { replace: true });
    return null;
  }

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const loggedInUser = await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate(homePathForUser(loggedInUser), { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Login — YULO Admin</title></Helmet>
      <div className="yulo-login-page">
        <div className="yulo-login-page__visual" aria-hidden="true">
          <img
            src={LOGIN_HERO_IMG}
            alt=""
            className="yulo-login-page__img"
            decoding="async"
          />
        </div>

        <div className="yulo-login-page__panel">
          <motion.div
            className="yulo-login-page__content"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="yulo-login__header">
              <YuloLogo variant="light" className="yulo-login__logo" />
              <h1 className="yulo-login__title">Welcome back</h1>
              <p className="yulo-login__subtitle">Sign in to your admin account</p>
            </div>

            <form className="yulo-login__form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="yulo-login__field">
                <label htmlFor="login-email">User ID / Email</label>
                <input
                  id="login-email"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter user ID or email"
                  className={errors.email ? 'is-invalid' : ''}
                  {...register('email', { required: 'User ID or email is required' })}
                />
                {errors.email && <span className="yulo-login__error">{errors.email.message}</span>}
              </div>

              <div className="yulo-login__field">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={errors.password ? 'is-invalid' : ''}
                  {...register('password', { required: 'Password is required' })}
                />
                {errors.password && <span className="yulo-login__error">{errors.password.message}</span>}
              </div>

              <button type="submit" className="btn btn-outline-light rounded-pill px-4 w-100" disabled={loading}>
                {loading ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right me-1" aria-hidden="true" />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Login;
