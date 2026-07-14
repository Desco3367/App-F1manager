import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LFM_SEED } from '../../api/seed-data';
import styles from './MotorDashboard.module.css';

const MotorDashboard = () => {
  const { profile } = useAuth();
  
  const [stat, setStat] = useState('potencia');
  const [mode, setMode] = useState('normal');
  const [note, setNote] = useState('');

  // En producción vendría de Firebase
  const teamId = profile?.teamId || 'ferrari';
  const teamData = LFM_SEED.teams.find(t => t.id === teamId);
  const pendingRequests = 0;
  
  const budget = 36; // Motor limit M (ejemplo de seed)
  const spent = 12; // Mock
  const remaining = budget - spent;
  
  const engineStats = {
    potencia: 85,
    fiabilidad: 90
  };

  const getCost = (modeId: string) => {
    if (modeId === 'conservador') return 2;
    if (modeId === 'normal') return 3;
    if (modeId === 'arriesgado') return 4;
    return 3;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Solicitud enviada: ${stat} en modo ${mode}. Coste: $${getCost(mode)}M`);
    setNote('');
  };

  if (!teamData?.isMotorist) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">
        Este apartado solo está disponible para equipos motoristas.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header del Motor */}
      <div className={styles.hero}>
        <div className={styles.heroInfo}>
          <span className={styles.eyebrow}>{teamData.name}</span>
          <h2 className={styles.engineName}>Motor {teamData.name} V6 Turbo</h2>
          <p className={styles.clients}>
            Clientes: {teamData.motorClients.length > 0 ? teamData.motorClients.join(', ') : 'Ninguno'}
          </p>
        </div>
        <div className={`${styles.budgetBadge} ${remaining < 5 ? styles.warn : ''}`}>
          ${remaining}M restante
        </div>
      </div>

      <div className={styles.grid}>
        {/* Panel de Solicitud */}
        <Card title="Testeo de Motor" className={styles.requestCard}>
          <p className="text-sm text-text-secondary mb-6">
            Envía a testear una pieza del motor al banco de pruebas. 
            El administrador calculará el éxito según las probabilidades de la tabla.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label>Estadística a mejorar</label>
              <select value={stat} onChange={(e) => setStat(e.target.value)} className={styles.input}>
                <option value="potencia">Potencia Base</option>
                <option value="fiabilidad">Fiabilidad Base</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label>Modo de Testeo</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} className={styles.input}>
                <option value="conservador">Conservador - ${getCost('conservador')}M (Más seguro, menos ganancia)</option>
                <option value="normal">Normal - ${getCost('normal')}M (Equilibrado)</option>
                <option value="arriesgado">Arriesgado - ${getCost('arriesgado')}M (Más ganancia, mayor riesgo de fallo)</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label>Nota</label>
              <input 
                type="text" 
                maxLength={120} 
                placeholder="Ej: Banco de pruebas #3" 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.submitContainer}>
              <span className="text-sm text-text-muted">
                {pendingRequests}/2 solicitudes pendientes
              </span>
              <Button type="submit" disabled={pendingRequests >= 2 || remaining < getCost(mode)}>
                Enviar al banco de pruebas
              </Button>
            </div>
          </form>
        </Card>

        {/* Panel de Estadísticas Actuales */}
        <div className={styles.sideCol}>
          <Card title="Estadísticas Base" className={styles.statsCard}>
            <div className={styles.statRow}>
              <span>Potencia Base</span>
              <strong className="text-success-text">{engineStats.potencia}</strong>
            </div>
            <div className={styles.statRow}>
              <span>Fiabilidad Base</span>
              <strong className="text-accent-blue">{engineStats.fiabilidad}</strong>
            </div>
          </Card>

          <Card title="Probabilidades (Simuladas)" className={styles.statsCard}>
            <p className="text-xs text-text-muted mb-4">
              Si envías <strong>{stat}</strong> en modo <strong>{mode}</strong> con tu stat actual, 
              las probabilidades del banco de pruebas serían aproximadamente:
            </p>
            <div className={styles.probRow}>
              <span>Gran Éxito (+2)</span>
              <strong>15%</strong>
            </div>
            <div className={styles.probRow}>
              <span>Éxito (+1)</span>
              <strong>50%</strong>
            </div>
            <div className={styles.probRow}>
              <span>Fallo (0)</span>
              <strong>25%</strong>
            </div>
            <div className={styles.probRow}>
              <span>Rotura (-1)</span>
              <strong className="text-danger-text">10%</strong>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MotorDashboard;
