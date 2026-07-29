import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loader from './Loader';

/** Accès membres inscrits (ou admin) — Formations & Coin RH */
export default function MemberRoute() {
  const { isMember, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader />;
  if (!isMember) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, message: 'Connectez-vous avec votre compte membre pour accéder à cette page.' }}
      />
    );
  }
  return <Outlet />;
}
