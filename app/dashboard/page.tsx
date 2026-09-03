import FinPulseApp from '@/app/components/FinPulseApp';
import AuthGuard from '@/app/components/auth/AuthGuard';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <FinPulseApp />
    </AuthGuard>
  );
}
