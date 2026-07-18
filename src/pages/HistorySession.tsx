import { Navigate, useParams } from 'react-router-dom';

/** Legacy recap route — workouts stay reopenable on the session surface. */
export function HistorySession() {
  const { sessionId = '' } = useParams();
  return <Navigate to={`/session/${sessionId}`} replace />;
}
