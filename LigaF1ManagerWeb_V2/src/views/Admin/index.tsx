import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import Overview from './Overview';
import TeamsDashboard from './TeamsDashboard';
import CarAdmin from './CarAdmin';
import EngineAdmin from './EngineAdmin';
import WeightsAdmin from './WeightsAdmin';
import TransfersAdmin from './TransfersAdmin';
import DatabaseAdmin from './DatabaseAdmin';
import styles from './Admin.module.css';

const AdminDashboard = () => {
  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className="text-xl font-heading font-black tracking-tight uppercase">Admin Center</h2>
        </div>
        
        <nav className={styles.navMenu}>
          <NavLink 
            to="/admin" 
            end
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            Dashboard
          </NavLink>
          <NavLink 
            to="/admin/teams" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            Equipos y Pilotos
          </NavLink>
          <NavLink 
            to="/admin/car" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            Solicitudes de Coche
          </NavLink>
          <NavLink 
            to="/admin/engine" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            Testeo de Motores
          </NavLink>
          <NavLink 
            to="/admin/weights" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            Tiradas de Pesos
          </NavLink>
          <NavLink 
            to="/admin/transfers" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            Economía
          </NavLink>
          <NavLink 
            to="/admin/database" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            Base de Datos
          </NavLink>
        </nav>
      </aside>

      <main className={styles.contentArea}>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="teams" element={<TeamsDashboard />} />
          <Route path="car" element={<CarAdmin />} />
          <Route path="engine" element={<EngineAdmin />} />
          <Route path="weights" element={<WeightsAdmin />} />
          <Route path="transfers" element={<TransfersAdmin />} />
          <Route path="database" element={<DatabaseAdmin />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;
