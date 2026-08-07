import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Thumbs } from 'swiper/modules';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import Loader from '../../components/common/Loader';
import ProductCard from '../../components/ui/ProductCard';
import PriceDisplay from '../../components/ui/PriceDisplay';
import RatingStars from '../../components/ui/RatingStars';
import SizeSelector from '../../components/ui/SizeSelector';
import ColorSwatch from '../../components/ui/ColorSwatch';
import QuantitySelector from '../../components/ui/QuantitySelector';
import ImageZoom from '../../components/ui/ImageZoom';
import Button from '../../components/ui/Button';
import ReviewForm from '../../components/forms/ReviewForm';
import useCart from '../../hooks/useCart';
import useWishlist from '../../hooks/useWishlist';
import { CompareContext } from '../../context/CompareContext';
import { useContext } from 'react';
import { productService } from '../../services/productService';
import { COLORS, SIZES } from '../../utils/constants';
import { getProductImages } from '../../utils/helpers';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';

export default function Product() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [fbt, setFbt] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [activeTab, setActiveTab] = useState('description');
  const [thumbsSwiper, setThumbsSwiper] = useState(null);

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCompare, isInCompare } = useContext(CompareContext);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      productService.getProduct(slug),
      productService.getRelated(slug),
      productService.getFrequentlyBought(slug),
    ]).then(([prodRes, relRes, fbtRes]) => {
      const p = prodRes.data?.data;
      setProduct(p);
      setRelated(relRes.data?.data ?? []);
      setFbt(fbtRes.data?.data ?? []);
      if (p?.variants?.[0]) {
        setSelectedSize(p.variants[0].size ?? '');
        setSelectedColor(p.variants[0].color ?? '');
      }
      if (p?.id) {
        productService.getReviews(p.id).then((r) => setReviews(r.data?.data ?? [])).catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Loader fullScreen />;
  if (!product) return <div className="container py-5 text-center">Product not found</div>;

  const images = getProductImages(product);

  const handleAddToCart = () => {
    const variant = product.variants?.find((v) => v.size === selectedSize && v.color === selectedColor);
    addToCart(product, { quantity, variant_id: variant?.id, size: selectedSize, color: selectedColor });
  };

  return (
    <>
      <SEO title={product.name} description={product.description?.slice(0, 160)} image={images[0]} />
      <div className="container py-4">
        <Breadcrumb items={[{ to: '/shop', label: 'Shop' }, { label: product.name }]} />

        <div className="row g-5 py-4">
          <div className="col-lg-6">
            <Swiper modules={[Navigation, Thumbs]} navigation thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }} className="mb-3">
              {images.map((img, i) => (
                <SwiperSlide key={i}>
                  <ImageZoom src={img} alt={product.name} />
                </SwiperSlide>
              ))}
            </Swiper>
            {images.length > 1 && (
              <Swiper modules={[Thumbs]} onSwiper={setThumbsSwiper} spaceBetween={8} slidesPerView={4} watchSlidesProgress>
                {images.map((img, i) => (
                  <SwiperSlide key={i}>
                    <img src={img} alt="" style={{ aspectRatio: '1', objectFit: 'cover', cursor: 'pointer' }} />
                  </SwiperSlide>
                ))}
              </Swiper>
            )}
          </div>

          <div className="col-lg-6">
            {product.brand_name && <span className="text-uppercase small text-muted letter-spacing">{product.brand_name}</span>}
            <h1 className="h3 fw-semibold mt-1 mb-2">{product.name}</h1>
            {product.average_rating > 0 && <RatingStars rating={product.average_rating} showValue />}
            <div className="my-3"><PriceDisplay price={product.price} salePrice={product.sale_price} size="lg" /></div>
            <p className="text-muted">{product.description ?? 'Premium craftsmanship meets contemporary design.'}</p>

            <div className="my-4">
              <label className="form-label small text-uppercase fw-medium">Color</label>
              <ColorSwatch colors={COLORS} selected={selectedColor} onSelect={setSelectedColor} />
            </div>
            <div className="my-4">
              <label className="form-label small text-uppercase fw-medium">Size</label>
              <SizeSelector sizes={SIZES} selected={selectedSize} onSelect={setSelectedSize} />
            </div>
            <div className="my-4">
              <label className="form-label small text-uppercase fw-medium">Quantity</label>
              <QuantitySelector value={quantity} onChange={setQuantity} />
            </div>

            <div className="d-flex flex-wrap gap-2 mb-4">
              <Button variant="gold" onClick={handleAddToCart}>Add to Cart</Button>
              <Button
                variant={isInWishlist(product.id) ? 'gold' : 'outline'}
                onClick={() => toggleWishlist(product)}
                aria-label="Wishlist"
              >
                <i className={`bi ${isInWishlist(product.id) ? 'bi-heart-fill' : 'bi-heart'}`} />
              </Button>
              <Button
                variant={isInCompare(product.id) ? 'gold' : 'outline'}
                onClick={() => addToCompare(product)}
                aria-label="Compare"
              >
                <i className="bi bi-arrow-left-right" />
              </Button>
            </div>
          </div>
        </div>

        <ul className="nav nav-tabs border-0 mb-4">
          {['description', 'reviews', 'shipping'].map((tab) => (
            <li key={tab} className="nav-item">
              <button className={`nav-link text-uppercase small ${activeTab === tab ? 'active border-dark' : 'text-muted'}`} onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            </li>
          ))}
        </ul>

        {activeTab === 'description' && (
          <div className="pb-5">
            <p>{product.description ?? 'Crafted with premium materials for lasting quality and timeless style.'}</p>
          </div>
        )}
        {activeTab === 'reviews' && (
          <div className="pb-5">
            {reviews.map((r) => (
              <div key={r.id} className="border-bottom py-3">
                <RatingStars rating={r.rating} />
                <p className="mt-2 mb-1">{r.comment ?? r.title}</p>
                <small className="text-muted">{r.user_name ?? r.name}</small>
              </div>
            ))}
            <div className="mt-4">
              <h5 className="mb-3">Write a Review</h5>
              <ReviewForm productId={product.id} />
            </div>
          </div>
        )}
        {activeTab === 'shipping' && (
          <div className="pb-5 text-muted">
            <p>Free shipping on orders above ₹999. Standard delivery 3-5 business days. Express shipping available at checkout.</p>
          </div>
        )}

        {related.length > 0 && (
          <section className="py-5 border-top">
            <h2 className="section-title h5 mb-4">You May Also Like</h2>
            <div className="row g-4">
              {related.map((p, i) => (
                <div key={p.id} className="col-6 col-md-3"><ProductCard product={p} index={i} /></div>
              ))}
            </div>
          </section>
        )}

        {fbt.length > 0 && (
          <section className="py-5 border-top">
            <h2 className="section-title h5 mb-4">Frequently Bought Together</h2>
            <div className="row g-4">
              {fbt.map((p, i) => (
                <div key={p.id} className="col-6 col-md-4"><ProductCard product={p} index={i} /></div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
