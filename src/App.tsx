import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';

import Home from './views/Public/Home';
import Calendar from './views/Public/Calendar';
import Standings from './views/Public/Standings';
import Login from './views/Auth/Login';

import TeamDashboard from './views/Team';
import AdminDashboard from './views/Admin';

function App() {
  const { user, isManager, isAdmin } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="standings" element={<Standings />} />
          <Route path="login" element={user ? <Navigate to="/team" replace /> : <Login />} />
          
          {/* Protected Routes - Manager */}
          <Route path="team/*" element={
            user && (isManager || isAdmin) ? <TeamDashboard /> : <Navigate to="/login" replace />
          } />

          {/* Protected Routes - Admin */}
          <Route path="admin/*" element={
            user && isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
