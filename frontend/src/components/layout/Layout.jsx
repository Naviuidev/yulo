import { Outlet } from 'react-router-dom';
import AnnouncementBar from './AnnouncementBar';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileMenu from './MobileMenu';
import SearchOverlay from './SearchOverlay';
import TrustBadges from '../common/TrustBadges';

export default function Layout() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <MobileMenu />
      <SearchOverlay />
      <main>
        <Outlet />
      </main>
      <TrustBadges />
      <Footer />
    </>
  );
}
