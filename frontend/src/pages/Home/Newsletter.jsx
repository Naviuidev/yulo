import NewsletterForm from '../../components/forms/NewsletterForm';

export default function Newsletter() {
  return (
    <section className="newsletter-section section-padding" data-aos="fade-up">
      <div className="container" style={{ maxWidth: 560 }}>
        <h2 className="section-title">Stay in the Loop</h2>
        <div className="gold-line" />
        <p className="section-subtitle mb-4">Exclusive drops, style guides, and member-only offers.</p>
        <NewsletterForm />
      </div>
    </section>
  );
}
