export const BRAND_NAME = 'YULO';
export const BRAND_TAGLINE = 'WEAR YULO. LOOK AWESOME.';
export const BRAND_DESCRIPTION =
  'Premium eyewear for the modern individual. Discover curated spectacles, sunglasses, and optical frames.';

export const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800&q=80', // classic black sunglasses
  'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80', // sunglasses flat lay
  'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&q=80', // optical eyeglasses
  'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800&q=80', // round spectacles
  'https://images.unsplash.com/photo-1556306510-31ca015374b0?w=800&q=80', // black frame glasses
  'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800&q=80', // lifestyle sunglasses
  'https://images.unsplash.com/photo-1582142306909-195724d33ffc?w=800&q=80', // clear optical frames
  'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800&q=80', // premium eyewear close-up
];

export const HERO_IMAGE =
  'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=1920&q=85';

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Top Rated' },
];

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
export const COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Gold', hex: '#956514' },
  { name: 'Gray', hex: '#777777' },
  { name: 'Navy', hex: '#1B2838' },
];

export const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: 'bi-cash-stack' },
  { id: 'upi', label: 'UPI', icon: 'bi-phone' },
  { id: 'phonepe', label: 'PhonePe', icon: 'bi-wallet2' },
];

export const MOCK_PRODUCTS = [
  {
    id: 1,
    name: 'Minimalist Wool Overcoat',
    slug: 'minimalist-wool-overcoat',
    price: 12999,
    sale_price: 9999,
    primary_image: PLACEHOLDER_IMAGES[0],
    average_rating: 4.8,
    review_count: 124,
    is_featured: true,
    is_new: true,
    brand_name: 'YULO Studio',
    category_name: 'Outerwear',
  },
  {
    id: 2,
    name: 'Structured Blazer',
    slug: 'structured-blazer',
    price: 8499,
    sale_price: null,
    primary_image: PLACEHOLDER_IMAGES[1],
    average_rating: 4.6,
    review_count: 89,
    is_featured: true,
    brand_name: 'YULO Studio',
    category_name: 'Blazers',
  },
  {
    id: 3,
    name: 'Silk Slip Dress',
    slug: 'silk-slip-dress',
    price: 6999,
    sale_price: 5499,
    primary_image: PLACEHOLDER_IMAGES[2],
    average_rating: 4.9,
    review_count: 203,
    is_new: true,
    brand_name: 'YULO Atelier',
    category_name: 'Dresses',
  },
  {
    id: 4,
    name: 'Tailored Trousers',
    slug: 'tailored-trousers',
    price: 4999,
    sale_price: null,
    primary_image: PLACEHOLDER_IMAGES[3],
    average_rating: 4.5,
    review_count: 67,
    brand_name: 'YULO Studio',
    category_name: 'Bottoms',
  },
  {
    id: 5,
    name: 'Cashmere Knit Sweater',
    slug: 'cashmere-knit-sweater',
    price: 7999,
    sale_price: 6499,
    primary_image: PLACEHOLDER_IMAGES[4],
    average_rating: 4.7,
    review_count: 156,
    is_featured: true,
    brand_name: 'YULO Atelier',
    category_name: 'Knitwear',
  },
  {
    id: 6,
    name: 'Leather Crossbody Bag',
    slug: 'leather-crossbody-bag',
    price: 5999,
    sale_price: null,
    primary_image: PLACEHOLDER_IMAGES[5],
    average_rating: 4.4,
    review_count: 42,
    brand_name: 'YULO Accessories',
    category_name: 'Bags',
  },
  {
    id: 7,
    name: 'Premium Cotton Tee',
    slug: 'premium-cotton-tee',
    price: 2499,
    sale_price: 1999,
    primary_image: PLACEHOLDER_IMAGES[6],
    average_rating: 4.3,
    review_count: 312,
    is_new: true,
    brand_name: 'YULO Essentials',
    category_name: 'Tops',
  },
  {
    id: 8,
    name: 'High-Rise Wide Leg Pants',
    slug: 'high-rise-wide-leg-pants',
    price: 5499,
    sale_price: null,
    primary_image: PLACEHOLDER_IMAGES[7],
    average_rating: 4.6,
    review_count: 98,
    brand_name: 'YULO Studio',
    category_name: 'Bottoms',
  },
];

export const MOCK_CATEGORIES = [
  { id: 1, name: 'Women', slug: 'women', image: PLACEHOLDER_IMAGES[1] },
  { id: 2, name: 'Men', slug: 'men', image: PLACEHOLDER_IMAGES[0] },
  { id: 3, name: 'Accessories', slug: 'accessories', image: PLACEHOLDER_IMAGES[5] },
  { id: 4, name: 'New Arrivals', slug: 'new-arrivals', image: PLACEHOLDER_IMAGES[2] },
];

export const MOCK_BRANDS = [
  { id: 1, name: 'YULO Studio', slug: 'yulo-studio' },
  { id: 2, name: 'YULO Atelier', slug: 'yulo-atelier' },
  { id: 3, name: 'YULO Essentials', slug: 'yulo-essentials' },
  { id: 4, name: 'YULO Accessories', slug: 'yulo-accessories' },
];

export const MOCK_REVIEWS = [
  {
    id: 1,
    user_name: 'Priya S.',
    rating: 5,
    comment: 'Exceptional quality and fit. The attention to detail is remarkable.',
    created_at: '2026-07-15',
  },
  {
    id: 2,
    user_name: 'Arjun M.',
    rating: 5,
    comment: 'Premium feel from packaging to product. Will definitely order again.',
    created_at: '2026-07-10',
  },
  {
    id: 3,
    user_name: 'Neha K.',
    rating: 4,
    comment: 'Beautiful design, slightly long delivery but worth the wait.',
    created_at: '2026-07-05',
  },
];

export const MOCK_BLOGS = [
  {
    id: 1,
    title: 'The Art of Minimalist Dressing',
    slug: 'art-of-minimalist-dressing',
    excerpt: 'Discover how less becomes more with curated capsule wardrobes.',
    image: PLACEHOLDER_IMAGES[0],
    created_at: '2026-07-20',
  },
  {
    id: 2,
    title: 'Spring/Summer 2026 Trends',
    slug: 'ss26-trends',
    excerpt: 'From structured silhouettes to refined neutrals — what to wear this season.',
    image: PLACEHOLDER_IMAGES[2],
    created_at: '2026-07-12',
  },
  {
    id: 3,
    title: 'Fabric Care Guide',
    slug: 'fabric-care-guide',
    excerpt: 'Preserve the luxury of your YULO pieces with expert care tips.',
    image: PLACEHOLDER_IMAGES[4],
    created_at: '2026-07-01',
  },
];

export const MOCK_FAQS = [
  {
    id: 1,
    question: 'What is your return policy?',
    answer: 'We offer 30-day hassle-free returns on unworn items with tags attached.',
  },
  {
    id: 2,
    question: 'How long does shipping take?',
    answer: 'Standard delivery takes 3-5 business days. Express shipping is available at checkout.',
  },
  {
    id: 3,
    question: 'Do you ship internationally?',
    answer: 'Currently we ship across India. International shipping coming soon.',
  },
  {
    id: 4,
    question: 'How can I track my order?',
    answer: 'Use the Track Order page with your order number and email to see real-time updates.',
  },
];

export const INSTAGRAM_IMAGES = PLACEHOLDER_IMAGES.slice(0, 6);
