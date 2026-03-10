import { LoginForm } from '@/components/auth/login-form';
import { PWAInstallPrompt } from '@/components/pwa-install';

export default function LoginPage() {
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <LoginForm />
      </div>
      <PWAInstallPrompt staffOnly />
    </>
  );
}
