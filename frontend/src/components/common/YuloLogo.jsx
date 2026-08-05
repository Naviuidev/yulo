/**
 * Crisp transparent YULO wordmark (SVG).
 * variant: 'light' | 'dark' | 'accent'
 */
const COLORS = {
  light: '#FFFFFF',
  dark: '#000000',
  accent: '#956514',
};

export default function YuloLogo({
  variant = 'dark',
  className = '',
  title = 'YULO',
}) {
  const color = COLORS[variant] || COLORS.dark;

  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 90"
      fill="none"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <g
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* Y */}
        <path d="M28 22 L52 54 L76 22" />
        <path d="M52 54 V72" />
        {/* U */}
        <path d="M108 22 V50 C108 64 118 74 130 74 C142 74 152 64 152 50 V22" />
        {/* L */}
        <path d="M184 22 V72 H226" />
        {/* O */}
        <circle cx="270" cy="47" r="25" />
      </g>
    </svg>
  );
}
