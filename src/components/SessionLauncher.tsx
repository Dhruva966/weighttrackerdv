import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkoutStore } from '../stores/workoutStore';

export function SessionLauncher() {
  const createSession = useWorkoutStore((state) => state.createSession);
  const navigate = useNavigate();

  useEffect(() => {
    const session = createSession();
    navigate(`/session/${session.id}`, { replace: true });
  }, [createSession, navigate]);

  return <p className="text-fgMuted">Starting workout...</p>;
}
