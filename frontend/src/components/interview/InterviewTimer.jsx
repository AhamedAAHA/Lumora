import { memo, useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

function InterviewTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <span className="flex items-center gap-1 text-sm text-white/50">
      <Clock className="h-4 w-4" />
      {formatted}
    </span>
  );
}

export default memo(InterviewTimer);
