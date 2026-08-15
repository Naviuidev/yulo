const ConfirmModal = ({
  show,
  title,
  message,
  children = null,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  confirmDisabled = false,
  pill = false,
  confirmIcon = null,
}) => {
  if (!show) return null;

  const shape = pill ? ' rounded-pill px-4' : '';
  const cancelClass = pill ? `btn btn-outline-dark${shape}` : 'btn btn-light';

  let confirmClass = `btn btn-dark${shape}`;
  if (variant === 'outline-dark') confirmClass = `btn btn-outline-dark${shape}`;
  else if (variant === 'danger') confirmClass = `btn btn-danger${shape}`;
  else if (variant === 'dark') confirmClass = `btn btn-dark${shape}`;

  return (
    <>
      <div className="modal-backdrop fade show yulo-confirm-backdrop" onClick={onCancel} />
      <div className="modal fade show d-block yulo-confirm-modal" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content yulo-modal">
            <div className="modal-header border-0">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" onClick={onCancel} aria-label="Close" />
            </div>
            <div className="modal-body">
              {message ? <p className="mb-0">{message}</p> : null}
              {children}
            </div>
            <div className="modal-footer border-0 gap-2">
              {cancelLabel ? (
                <button
                  type="button"
                  className={cancelClass}
                  onClick={onCancel}
                  disabled={confirmDisabled}
                >
                  {cancelLabel}
                </button>
              ) : null}
              <button
                type="button"
                className={confirmClass}
                onClick={onConfirm}
                disabled={confirmDisabled}
              >
                {confirmIcon ? <i className={`bi ${confirmIcon} me-1`} aria-hidden="true" /> : null}
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmModal;
