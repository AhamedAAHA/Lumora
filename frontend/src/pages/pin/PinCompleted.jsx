import { Link } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import { clearPinAuth } from '../../lib/pinApi';

export default function PinCompleted() {
  return (
    <AuthLayout title="Interview complete" subtitle="Thank you — your responses were recorded">
      <p className="mt-4 text-sm text-white/55">
        This PIN cannot be used again. Your recruiter will review your AI evaluation report.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link to="/" className="btn-primary w-full text-center !rounded-xl" onClick={clearPinAuth}>
          Done
        </Link>
        <Link to="/pin" className="btn-secondary w-full text-center text-sm" onClick={clearPinAuth}>
          Exit
        </Link>
      </div>
    </AuthLayout>
  );
}
