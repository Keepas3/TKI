import LoginPage from '../../components/LoginPage';
import { NAV_BAR_HEIGHT } from '../../components/NavBar';

export const metadata = { title: 'Sign In — TKI' };

export default function Login() {
  return (
    <div style={{ paddingTop: NAV_BAR_HEIGHT, minHeight: '100vh' }}>
      <LoginPage />
    </div>
  );
}
