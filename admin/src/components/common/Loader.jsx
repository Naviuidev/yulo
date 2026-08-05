const Loader = ({ fullScreen = false, text = 'Loading...' }) => (
  <div className={`yulo-loader ${fullScreen ? 'yulo-loader--fullscreen' : ''}`}>
    <div className="spinner-border text-gold" role="status">
      <span className="visually-hidden">{text}</span>
    </div>
    {text && <p className="mt-3 text-muted small">{text}</p>}
  </div>
);

export default Loader;
