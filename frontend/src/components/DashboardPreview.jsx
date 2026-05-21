import OSDashboard from './os/OSDashboard';

export default function DashboardPreview() {
  return (
    <div className="w-full max-w-full overflow-hidden">
      <OSDashboard compact />
    </div>
  );
}
