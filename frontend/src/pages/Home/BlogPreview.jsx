import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { blogService } from '../../services/contentService';
import { MOCK_BLOGS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';

export default function BlogPreview() {
  const [blogs, setBlogs] = useState(MOCK_BLOGS);

  useEffect(() => {
    blogService.getBlogs({ per_page: 3 })
      .then((res) => setBlogs((res.data?.data ?? MOCK_BLOGS).slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <section className="section-padding" style={{ background: 'var(--bg)' }} data-aos="fade-up">
      <div className="container">
        <div className="d-flex justify-content-between align-items-end mb-5">
          <div>
            <h2 className="section-title mb-0">From the Journal</h2>
            <div className="gold-line gold-line-left" />
          </div>
          <Link to="/blog" className="small text-uppercase fw-medium text-decoration-none">View All →</Link>
        </div>
        <div className="row g-4">
          {blogs.map((blog) => (
            <div key={blog.id} className="col-md-4">
              <Link to={`/blog/${blog.slug}`} className="text-decoration-none text-dark">
                <img src={blog.image ?? blog.featured_image} alt={blog.title} className="w-100 mb-3" style={{ aspectRatio: '16/10', objectFit: 'cover' }} />
                <small className="text-muted">{formatDate(blog.created_at)}</small>
                <h3 className="h6 fw-medium mt-1">{blog.title}</h3>
                <p className="text-muted small">{blog.excerpt}</p>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
