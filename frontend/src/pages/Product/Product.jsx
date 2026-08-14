import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
import useAuth from '../../hooks/useAuth';
import { CompareContext } from '../../context/CompareContext';
import { useContext } from 'react';
import { productService } from '../../services/productService';
import { COLORS, SIZES } from '../../utils/constants';
import { getProductColorOptions, getProductSizeOptions } from '../../utils/formatPrice';
import { getProductImages } from '../../utils/helpers';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';

export default function Product() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [fbt, setFbt] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [activeTab, setActiveTab] = useState('description');
  const [thumbsSwiper, setThumbsSwiper] = useState(null);

  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
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
      } else {
        const sizes = getProductSizeOptions(p);
        const colors = getProductColorOptions(p);
        if (sizes[0]) setSelectedSize(sizes[0]);
        if (colors[0]) setSelectedColor(colors[0].name);
      }
      if (p?.id) {
        productService.getReviews(p.id).then((r) => setReviews(r.data?.data ?? [])).catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Loader fullScreen />;
  if (!product) return <div className="container py-5 text-center">Product not found</div>;

  const images = getProductImages(product);
  const colorOptions = getProductColorOptions(product);
  const sizeOptions = getProductSizeOptions(product);
  const colorConfigured = product.has_color_variants !== undefined && product.has_color_variants !== null;
  const sizeConfigured = (Array.isArray(product.sizes) && product.sizes.length >= 0)
    || (product.size_option !== undefined && product.size_option !== null);
  const displayColors = colorConfigured
    ? (Number(product.has_color_variants) ? colorOptions : [])
    : COLORS;
  const displaySizes = sizeConfigured
    ? sizeOptions
    : SIZES;

  const resolveVariantOptions = () => {
    const variant = product.variants?.find((v) => v.size === selectedSize && v.color === selectedColor);
    return {
      quantity,
      variant_id: variant?.id,
      size: selectedSize,
      color: selectedColor,
    };
  };

  const handleAddToCart = () => {
    addToCart(product, resolveVariantOptions());
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: { from: { pathname: `/product/${slug}` } },
      });
      return;
    }

    setBuying(true);
    try {
      const ok = await addToCart(product, { ...resolveVariantOptions(), silent: true });
      if (ok) navigate('/checkout');
    } finally {
      setBuying(false);
    }
  };

  return (
    <>
      <SEO title={product.name} description={product.description?.slice(0, 160)} image={images[0]} />
      <div className="container py-4">
        <Breadcrumb items={[{ to: '/shop', label: 'Shop' }, { label: product.name }]} />

        <div className="row g-5 py-4">
          <div className="col-lg-6">
            <Swiper modules={[Navigation, Thumbs]} navigation thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }} className="product-gallery-swiper mb-3">
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
            <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
              {product.category_name ? (
                <span className="small text-muted">{product.category_name}</span>
              ) : null}
              {Number(product.average_rating) > 0 ? (
                <span className="d-inline-flex align-items-center gap-1">
                  <RatingStars rating={product.average_rating} showValue />
                  <span className="small text-muted">({Number(product.review_count || 0)} reviews)</span>
                </span>
              ) : (
                <span className="small text-muted">No reviews yet</span>
              )}
            </div>
            <div className="my-3"><PriceDisplay price={product.price} salePrice={product.sale_price} size="lg" /></div>
            <p className="text-muted">{product.description ?? 'Premium craftsmanship meets contemporary design.'}</p>

            {displayColors.length > 0 && (
              <div className="my-4">
                <label className="form-label small text-uppercase fw-medium">Color</label>
                <ColorSwatch colors={displayColors} selected={selectedColor} onSelect={setSelectedColor} />
              </div>
            )}
            {displaySizes.length > 0 && (
              <div className="my-4">
                <label className="form-label small text-uppercase fw-medium">Size</label>
                <SizeSelector sizes={displaySizes} selected={selectedSize} onSelect={setSelectedSize} />
              </div>
            )}
            <div className="my-4">
              <label className="form-label small text-uppercase fw-medium">Quantity</label>
              <QuantitySelector value={quantity} onChange={setQuantity} />
            </div>

            <div className="product-actions mb-4">
              <div className="product-actions__row">
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
              <Button
                variant="primary"
                className="product-actions__buy"
                loading={buying}
                onClick={handleBuyNow}
              >
                Buy Now
              </Button>
            </div>

            <div className="yulo-product-tabs mb-3 mt-2">
              {[
                { id: 'description', label: 'Description', icon: 'bi-card-text' },
                { id: 'reviews', label: 'Reviews', icon: 'bi-star' },
                { id: 'shipping', label: 'Shipping', icon: 'bi-truck' },
                { id: 'returns', label: 'Damaged / Wrong Product', icon: 'bi-exclamation-triangle' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`yulo-product-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <i className={`bi ${tab.icon}`} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {activeTab === 'description' && (
              <div className="pb-2">
                <p className="mb-0">{product.description ?? 'Crafted with premium materials for lasting quality and timeless style.'}</p>
              </div>
            )}
            {activeTab === 'reviews' && (
              <div className="pb-2">
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
              <div className="pb-2 text-muted">
                <p className="mb-0">Free shipping on orders above ₹999. Standard delivery 3-5 business days. Express shipping available at checkout.</p>
              </div>
            )}
            {activeTab === 'returns' && (
              <div className="pb-2 yulo-product-policy">
                <h3 className="yulo-product-policy__title">Damaged, Defective, or Wrong Product</h3>
                <p className="yulo-product-policy__lead">
                  If you receive a damaged, defective, missing, or incorrect product, please raise a request within 48 hours of delivery and provide:
                </p>
                <ul className="yulo-product-policy__list">
                  <li>The mandatory unboxing video.</li>
                  <li>Clear photos of the product and packaging.</li>
                  <li>Your order ID.</li>
                </ul>
                <p className="yulo-product-policy__note mb-0">
                  After verification, YULO will arrange a replacement or refund.
                </p>
              </div>
            )}
          </div>
        </div>

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
