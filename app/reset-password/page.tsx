import ResetPasswordPage from '../../components/ResetPasswordPage';
import { NAV_BAR_HEIGHT } from '../../components/NavBar';

export const metadata = { title: 'Reset Password — TKI' };

export default function ResetPassword() {
  return (
    <div style={{ paddingTop: NAV_BAR_HEIGHT, minHeight: '100vh' }}>
      <ResetPasswordPage />
    </div>
  );
}
