/**
 * YULO wordmark image.
 * variant: 'light' (white, for dark backgrounds) | 'dark' (black, for light backgrounds)
 */
const SRC = {
  light: '/logo-light.png',
  dark: '/logo-dark.png',
  accent: '/logo-dark.png',
};

export default function YuloLogo({
  variant = 'dark',
  className = '',
  title = 'YULO',
}) {
  const src = SRC[variant] || SRC.dark;

  return (
    <img
      src={src}
      alt={title}
      className={className}
      decoding="async"
    />
  );
}
