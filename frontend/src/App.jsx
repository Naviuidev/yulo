import AppRoutes from './routes/AppRoutes';
import VisitTracker from './components/common/VisitTracker';
import ScrollToTop from './components/common/ScrollToTop';
import SiteFavicon from './components/common/SiteFavicon';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <VisitTracker />
      <SiteFavicon />
      <AppRoutes />
    </>
  );
}
