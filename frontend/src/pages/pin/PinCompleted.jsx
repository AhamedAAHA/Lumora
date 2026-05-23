import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import { clearPinAuth } from '../../lib/pinApi';

export default function PinCompleted() {
  const done = () => clearPinAuth();

  return (
    <AuthLayout title="Interview complete" subtitle="Thank you — your responses were recorded" showCta={false}>
      <div className="slide-up mt-6 flex flex-col items-center text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-400" />
        <p className="mt-4 text-sm text-white/55">
          This PIN cannot be used again. Your recruiter will review your AI evaluation report.
        </p>
        <Link to="/" className="btn-primary btn-3d mt-8 w-full text-center !rounded-xl" onClick={done}>
          Done
        </Link>
      </div>
    </AuthLayout>
  );
}
