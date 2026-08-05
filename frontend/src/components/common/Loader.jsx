export default function Loader({ fullScreen = false, size = 'md' }) {
  const spinnerSize = size === 'sm' ? 'spinner-border-sm' : '';
  const content = (
    <div className={`spinner-border text-dark ${spinnerSize}`} role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-50 py-5">
        {content}
      </div>
    );
  }
  return content;
}
