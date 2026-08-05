import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import Loader from '../../components/common/Loader';
import { blogService } from '../../services/contentService';
import { formatDate } from '../../utils/helpers';

export default function BlogDetail() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    blogService.getBlog(slug)
      .then((r) => setBlog(r.data?.data))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Loader fullScreen />;
  if (!blog) return <div className="container py-5 text-center">Article not found</div>;

  return (
    <>
      <SEO title={blog.title} description={blog.excerpt} image={blog.image} />
      <article className="container py-5" style={{ maxWidth: 800 }}>
        <Breadcrumb items={[{ to: '/blog', label: 'Journal' }, { label: blog.title }]} />
        <small className="text-muted">{formatDate(blog.created_at)}</small>
        <h1 className="display-6 fw-semibold my-3">{blog.title}</h1>
        <img src={blog.image ?? blog.featured_image} alt={blog.title} className="w-100 mb-5" style={{ aspectRatio: '16/9', objectFit: 'cover' }} />
        <div className="blog-content" dangerouslySetInnerHTML={{ __html: blog.content ?? `<p>${blog.excerpt}</p>` }} />
        <div className="mt-5 pt-4 border-top">
          <Link to="/blog" className="small text-uppercase fw-medium">← Back to Journal</Link>
        </div>
      </article>
    </>
  );
}
