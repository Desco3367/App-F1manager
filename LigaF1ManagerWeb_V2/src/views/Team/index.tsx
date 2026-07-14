
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Overview from './Overview';
import CarDashboard from './CarDashboard';
import WeightsDashboard from './WeightsDashboard';
import MotorDashboard from './MotorDashboard';
import EconomyDashboard from './EconomyDashboard';
import styles from './Team.module.css';

const TeamDashboard = () => {
  const { profile } = useAuth();
  const isMotorist = profile?.teamId === 'redbull' || profile?.teamId === 'williams' || profile?.teamId === 'sauber' || profile?.teamId === 'astonmartin'; // Basic check, ideally read from team data

  return (
    <div>
      <header className={styles.header}>
        <h1>Panel del Equipo</h1>
        <p>Gestiona tu equipo, desarrolla el coche y controla tu presupuesto.</p>
      </header>

      <nav className={styles.tabNav}>
        <NavLink to="/team" end className={({ isActive }) => `${styles.tabItem} ${isActive ? styles.active : ''}`}>Resumen</NavLink>
        <NavLink to="/team/car" className={({ isActive }) => `${styles.tabItem} ${isActive ? styles.active : ''}`}>Coche</NavLink>
        <NavLink to="/team/weights" className={({ isActive }) => `${styles.tabItem} ${isActive ? styles.active : ''}`}>Pesos</NavLink>
        {isMotorist && (
          <NavLink to="/team/motor" className={({ isActive }) => `${styles.tabItem} ${isActive ? styles.active : ''}`}>Motor</NavLink>
        )}
        <NavLink to="/team/economy" className={({ isActive }) => `${styles.tabItem} ${isActive ? styles.active : ''}`}>Economía</NavLink>
      </nav>

      <div className={styles.contentArea}>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="car" element={<CarDashboard />} />
          <Route path="weights" element={<WeightsDashboard />} />
          {isMotorist && <Route path="motor" element={<MotorDashboard />} />}
          <Route path="economy" element={<EconomyDashboard />} />
          <Route path="*" element={<Navigate to="/team" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default TeamDashboard;
