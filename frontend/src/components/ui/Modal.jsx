export default function Modal({ show, onClose, title, children, size = '' }) {
  if (!show) return null;

  return (
    <>
      <div className="modal fade show d-block yulo-modal" tabIndex="-1" role="dialog">
        <div className={`modal-dialog modal-dialog-centered ${size}`}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title text-uppercase letter-spacing">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body">{children}</div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}
