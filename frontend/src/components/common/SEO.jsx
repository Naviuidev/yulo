import { Helmet } from 'react-helmet-async';
import { BRAND_NAME, SITE_TITLE } from '../../utils/constants';

export default function SEO({ title, description, keywords, image, url }) {
  const pageTitle = title ? `${title} | ${BRAND_NAME}` : SITE_TITLE;
  const desc =
    description ??
    'Discover fashion, accessories and more at YULO. Wear YULO, Look Awesome.';

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
