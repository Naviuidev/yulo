import { useEffect, useState } from 'react';
import { faqService } from '../../services/contentService';
import { MOCK_FAQS } from '../../utils/constants';

export default function FAQSection() {
  const [faqs, setFaqs] = useState(MOCK_FAQS);

  useEffect(() => {
    faqService.getFaqs()
      .then((res) => setFaqs(res.data?.data ?? MOCK_FAQS))
      .catch(() => {});
  }, []);

  return (
    <section className="section-padding border-top" data-aos="fade-up">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="text-center mb-5">
          <h2 className="section-title">FAQ</h2>
          <div className="gold-line" />
        </div>
        <div className="accordion faq-accordion" id="homeFaq">
          {faqs.map((faq, i) => (
            <div key={faq.id} className="accordion-item">
              <h3 className="accordion-header">
                <button
                  className={`accordion-button ${i !== 0 ? 'collapsed' : ''}`}
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target={`#faq-${faq.id}`}
                >
                  {faq.question}
                </button>
              </h3>
              <div id={`faq-${faq.id}`} className={`accordion-collapse collapse ${i === 0 ? 'show' : ''}`} data-bs-parent="#homeFaq">
                <div className="accordion-body">{faq.answer}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
