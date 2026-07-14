
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../api/firebase';
import styles from './Layout.module.css';

const Topbar = () => {
  const { user, profile } = useAuth();

  const getRoleLabel = () => {
    if (!user) return 'Público';
    if (profile?.role === 'admin') return 'Administrador';
    if (profile?.role === 'manager') return `Mánager | ${profile.teamId}`;
    return 'Autenticado';
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>F1</span>
        <div className={styles.brandTitles}>
          <h1>Liga F1 Manager</h1>
          <p>Temporadas, equipos y economía centralizada</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={styles.authBadge}>{getRoleLabel()}</span>
        {user && (
          <button 
            className={styles.logoutBtn}
            onClick={() => auth.signOut()}
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </header>
  );
};

export default Topbar;
