import { Navigate } from 'react-router-dom';

/** Legacy route — gym calendar now lives on Move. */
export function Calendar() {
  return <Navigate to="/move" replace />;
}
