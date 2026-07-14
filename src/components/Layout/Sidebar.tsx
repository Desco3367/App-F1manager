
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Layout.module.css';

const Sidebar = () => {
  const { user, isManager, isAdmin } = useAuth();

  return (
    <aside className={styles.sidebar}>
      <NavLink 
        to="/" 
        className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
        end
      >
        Parrilla Oficial
      </NavLink>

      <NavLink 
        to="/calendar" 
        className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
      >
        Calendario
      </NavLink>

      <NavLink 
        to="/standings" 
        className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
      >
        Campeonato
      </NavLink>
      
      {!user && (
        <NavLink 
          to="/login" 
          className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
        >
          Login
        </NavLink>
      )}

      {user && (isManager || isAdmin) && (
        <NavLink 
          to="/team" 
          className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
        >
          Mi equipo
        </NavLink>
      )}

      {user && isAdmin && (
        <NavLink 
          to="/admin" 
          className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
        >
          Admin
        </NavLink>
      )}
    </aside>
  );
};

export default Sidebar;
