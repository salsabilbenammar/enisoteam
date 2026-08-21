import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loader from './Loader';

/** Accès bureau — les membres n'accèdent jamais au back-office. */
export default function ProtectedRoute() {
  const { isAdmin, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader />;
  if (!isAdmin) {
    if (isAuthenticated) {
      return (
        <Navigate
          to="/"
          replace
          state={{ message: 'Accès réservé aux comptes du bureau.' }}
        />
      );
    }
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    );
  }
  return <Outlet />;
}
