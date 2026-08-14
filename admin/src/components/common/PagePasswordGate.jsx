import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Custom password popup gate. Children render only after the correct password.
 * Always asks again when the page is opened (including after leaving and returning).
 */
export default function PagePasswordGate({
  id,
  password,
  title = 'Protected page',
  message = 'Enter the password to view this page.',
  children,
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [showPopup, setShowPopup] = useState(true);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (showPopup && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showPopup]);

  const unlock = (e) => {
    e?.preventDefault?.();
    if (value !== password) {
      setError('Incorrect password. Try again.');
      setValue('');
      inputRef.current?.focus();
      return;
    }
    setError('');
    setValue('');
    setUnlocked(true);
    setShowPopup(false);
  };

  if (!unlocked) {
    return (
      <>
        <div className="yulo-password-gate">
          <div className="yulo-password-gate__card">
            <div className="yulo-password-gate__icon">
              <i className="bi bi-shield-lock" />
            </div>
            <h2 className="yulo-password-gate__title">{title}</h2>
            <p className="yulo-password-gate__text">
              This page is locked. Enter the password to continue.
            </p>
            <div className="d-flex gap-2 flex-wrap justify-content-center">
              <button type="button" className="btn btn-dark" onClick={() => setShowPopup(true)}>
                Enter password
              </button>
              <Link to="/" className="btn btn-outline-dark">
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>

        {showPopup ? (
          <>
            <div className="modal-backdrop fade show yulo-confirm-backdrop" />
            <div
              className="modal fade show d-block yulo-confirm-modal"
              tabIndex="-1"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`password-gate-${id}-title`}
            >
              <div className="modal-dialog modal-dialog-centered">
                <form className="modal-content yulo-modal yulo-password-popup" onSubmit={unlock}>
                  <div className="modal-header border-0">
                    <h5 className="modal-title" id={`password-gate-${id}-title`}>
                      <i className="bi bi-lock-fill me-2" />
                      {title}
                    </h5>
                  </div>
                  <div className="modal-body">
                    <p className="text-muted mb-3">{message}</p>
                    <label className="form-label" htmlFor={`password-gate-${id}-input`}>
                      Password
                    </label>
                    <input
                      ref={inputRef}
                      id={`password-gate-${id}-input`}
                      type="password"
                      className={`form-control ${error ? 'is-invalid' : ''}`}
                      value={value}
                      onChange={(e) => {
                        setValue(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="Enter password"
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                    />
                    {error ? <div className="invalid-feedback d-block">{error}</div> : null}
                  </div>
                  <div className="modal-footer border-0">
                    <Link to="/" className="btn btn-light">
                      Cancel
                    </Link>
                    <button type="submit" className="btn btn-dark" disabled={!value.trim()}>
                      Unlock
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        ) : null}
      </>
    );
  }

  return children;
}
