const ConfirmModal = ({ show, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', onConfirm, onCancel, variant = 'danger' }) => {
  if (!show) return null;

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
            <div className="modal-body">{message}</div>
            <div className="modal-footer border-0">
              <button type="button" className="btn btn-light" onClick={onCancel}>
                {cancelLabel}
              </button>
              <button type="button" className={`btn btn-${variant}`} onClick={onConfirm}>
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
