/**
 * H5 E2E Test Page Objects and Helpers
 */
export { H5LoginPage } from './LoginPage';
export { H5HomePage } from './HomePage';
export { H5CheckInPage } from './CheckInPage';
export { H5PointsPage } from './PointsPage';
export { H5ProfilePage } from './ProfilePage';
export { H5MallPage } from './MallPage';
export { BASE_URL, API_BASE, TEST_USERS } from './config';
export {
  loginAsH5User,
  loginAndNavigate,
  clearH5Auth,
  isOnLoginPage,
  uniqueId,
  waitForToast,
  waitForTabBar,
  getTabBarItems,
  clickTabBarItem,
} from './helpers';
