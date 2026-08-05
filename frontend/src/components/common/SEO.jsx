import { Helmet } from 'react-helmet-async';
import { BRAND_NAME } from '../../utils/constants';

export default function SEO({ title, description, keywords, image, url }) {
  const pageTitle = title ? `${title} | ${BRAND_NAME}` : `${BRAND_NAME} — Premium Fashion`;
  const desc =
    description ??
    'Discover premium fashion at YULO. Minimalist elegance, curated collections, and timeless style.';

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={desc} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={desc} />
      {image && <meta property="og:image" content={image} />}
      {url && <meta property="og:url" content={url} />}
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
  );
}
