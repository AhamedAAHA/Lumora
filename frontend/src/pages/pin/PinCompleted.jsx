import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import { getPinToken } from '../../lib/pinApi';

/** Legacy route — redirects to review results */
export default function PinCompleted() {
  const navigate = useNavigate();

  useEffect(() => {
    if (getPinToken()) {
      navigate('/pin/review', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return (
    <AuthLayout title="Loading results…" showCta={false}>
      <div className="flex justify-center py-12">
        <div className="loading-spinner" />
      </div>
    </AuthLayout>
  );
}
