import RegisterPage from '../../components/RegisterPage';
import { NAV_BAR_HEIGHT } from '../../components/NavBar';

export const metadata = { title: 'Create Account — TKI' };

export default function Register() {
  return (
    <div style={{ paddingTop: NAV_BAR_HEIGHT, minHeight: '100vh' }}>
      <RegisterPage />
    </div>
  );
}
