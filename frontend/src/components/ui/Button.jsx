import { classNames } from '../../utils/helpers';

export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  loading = false,
  disabled = false,
  ...props
}) {
  const variants = {
    primary: 'btn-yulo',
    outline: 'btn-yulo btn-yulo-outline',
    gold: 'btn-yulo btn-yulo-gold',
  };

  return (
    <button
      type={type}
      className={classNames(variants[variant] ?? variants.primary, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="spinner-border spinner-border-sm" role="status" />
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
}
