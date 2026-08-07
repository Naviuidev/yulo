import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import SEO from '../../components/common/SEO';
import OfferPopup from '../../components/common/OfferPopup';
import HeroBanner from './HeroBanner';
import FeaturedCollection from './FeaturedCollection';
import NewArrivals from './NewArrivals';
import Trending from './Trending';
import BestSellers from './BestSellers';
import FlashSale from './FlashSale';
import DealOfDay from './DealOfDay';
import Categories from './Categories';
import Brands from './Brands';
import CustomerReviews from './CustomerReviews';
import InstagramGallery from './InstagramGallery';
import BlogPreview from './BlogPreview';
import Newsletter from './Newsletter';
import FAQSection from './FAQSection';

export default function Home() {
  useEffect(() => {
    AOS.init({ duration: 800, once: true, offset: 80 });
  }, []);

  return (
    <>
      <SEO title="Premium Eyewear" description="YULO — Wear YULO. Look Awesome. Premium spectacles, sunglasses, and optical frames." />
      <OfferPopup />
      <HeroBanner />
      <Categories />
      <FeaturedCollection />
      <NewArrivals />
      <Trending />
      <BestSellers />
      <FlashSale />
      <DealOfDay />
      <Brands />
      <CustomerReviews />
      <InstagramGallery />
      <BlogPreview />
      <Newsletter />
      <FAQSection />
    </>
  );
}
