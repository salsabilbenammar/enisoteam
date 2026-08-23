import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/bureauPermissions';

/** Bandeau lecture seule pour un module admin. */
export default function ReadOnlyBanner({ module }) {
  const { canEdit, user } = useAuth();
  if (!module || canEdit(module)) return null;

  return (
    <div className="alert alert-error" role="status" style={{ marginBottom: '1rem' }}>
      Mode lecture seule — votre poste ({roleLabel(user?.role)}) peut consulter cette section,
      mais pas la modifier.
    </div>
  );
}
