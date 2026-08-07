import { Outlet } from 'react-router-dom';
import AnnouncementBar from './AnnouncementBar';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import Footer from './Footer';
import MobileMenu from './MobileMenu';
import SearchOverlay from './SearchOverlay';
import TrustBadges from '../common/TrustBadges';

export default function Layout() {
  return (
    <div className="yulo-app-shell">
      <AnnouncementBar />
      <Navbar />
      <MobileMenu />
      <SearchOverlay />
      <main>
        <Outlet />
      </main>
      <TrustBadges />
      <Footer />
      <BottomNav />
    </div>
  );
}
