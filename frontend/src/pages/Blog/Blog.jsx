import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import Loader from '../../components/common/Loader';
import { blogService } from '../../services/contentService';
import { MOCK_BLOGS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';

export default function Blog() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    blogService.getBlogs()
      .then((r) => setBlogs(r.data?.data ?? MOCK_BLOGS))
      .catch(() => setBlogs(MOCK_BLOGS))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <SEO title="Journal" description="Style guides, trends, and stories from YULO." />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: 'Journal' }]} />
          <h1>Journal</h1>
        </div>
      </div>

      <div className="container py-5">
        {loading ? <Loader fullScreen /> : (
          <div className="row g-5">
            {blogs.map((blog) => (
              <div key={blog.id} className="col-md-6 col-lg-4">
                <Link to={`/blog/${blog.slug}`} className="text-decoration-none text-dark">
                  <img src={blog.image ?? blog.featured_image} alt={blog.title} className="w-100 mb-3" style={{ aspectRatio: '16/10', objectFit: 'cover' }} />
                  <small className="text-muted">{formatDate(blog.created_at)}</small>
                  <h2 className="h5 fw-medium mt-1">{blog.title}</h2>
                  <p className="text-muted">{blog.excerpt}</p>
                  <span className="small text-uppercase fw-medium">Read More →</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
