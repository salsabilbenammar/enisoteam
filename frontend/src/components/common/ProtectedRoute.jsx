import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loader from './Loader';

/** Accès admin uniquement */
export default function ProtectedRoute() {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader />;
  if (!isAdmin) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
