import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getTeams, getAllEngines, submitEngineRequest, updateTeamBudget, subscribeToEngineRequests } from '../../api/db';
import { Engine } from '../../types';
import styles from './MotorDashboard.module.css';

const MotorDashboard = () => {
  const { profile } = useAuth();
  const [budget, setBudget] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMotorist, setIsMotorist] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [clients, setClients] = useState<string[]>([]);
  
  const [stat, setStat] = useState<'power' | 'reliability'>('power');
  const [mode, setMode] = useState('normal');
  const [note, setNote] = useState('');

  const [engineStats, setEngineStats] = useState<Engine>({ teamId: '', power: 0, reliability: 0 });
  const [pendingRequests, setPendingRequests] = useState(0);

  const teamId = profile?.teamId || 'ferrari';

  useEffect(() => {
    const loadData = async () => {
      const teams = await getTeams();
      const myTeam = teams.find(t => t.id === teamId);
      if (myTeam) {
        setBudget(myTeam.budgetRemainingM);
        setIsMotorist(myTeam.isMotorist);
        setTeamName(myTeam.name);
        
        // Find clients
        const myClients = teams.filter(t => !t.isMotorist && t.motoristId === teamId).map(t => t.name);
        setClients(myClients);
      }

      if (myTeam?.isMotorist) {
        const engines = await getAllEngines();
        const myEngine = engines.find(e => e.teamId === teamId);
        if (myEngine) {
          setEngineStats(myEngine);
        }
      }
      setIsLoading(false);
    };
    loadData();

    const unsubscribe = subscribeToEngineRequests((allReqs) => {
      const myPending = allReqs.filter(r => r.teamId === teamId && r.status === 'pending');
      setPendingRequests(myPending.length);
    });

    return () => unsubscribe();
  }, [teamId]);

  const getCost = (modeId: string) => {
    if (modeId === 'conservador') return 2;
    if (modeId === 'normal') return 3;
    if (modeId === 'arriesgado') return 4;
    return 3;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = getCost(mode);
    if (budget < cost) {
      alert('Presupuesto insuficiente.');
      return;
    }
    if (pendingRequests >= 2) {
      alert('Tienes demasiadas solicitudes pendientes.');
      return;
    }

    setIsLoading(true);
    const activeSeason = "season2026";
    const success = await submitEngineRequest(teamId, activeSeason, stat, mode, note || 'Sin nota');
    
    if (success) {
      const newBudget = budget - cost;
      await updateTeamBudget(teamId, newBudget);
      setBudget(newBudget);
      alert(`Solicitud enviada al banco de pruebas. Coste: $${cost}M`);
      setNote('');
    } else {
      alert('Error al enviar la solicitud.');
    }
    setIsLoading(false);
  };

  if (isLoading && budget === 0) {
    return <div className="p-8 text-center text-text-muted">Cargando...</div>;
  }

  if (!isMotorist) {
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
          <span className={styles.eyebrow}>{teamName}</span>
          <h2 className={styles.engineName}>Motor {teamName} V6 Turbo</h2>
          <p className={styles.clients}>
            Clientes: {clients.length > 0 ? clients.join(', ') : 'Ninguno'}
          </p>
        </div>
        <div className={`${styles.budgetBadge} ${budget < 5 ? styles.warn : ''}`}>
          ${budget}M restante
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
              <select value={stat} onChange={(e) => setStat(e.target.value as any)} className={styles.input}>
                <option value="power">Potencia Base</option>
                <option value="reliability">Fiabilidad Base</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label>Modo de Testeo</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} className={styles.input}>
                <option value="conservador">Conservador - ${getCost('conservador')}M (Más seguro)</option>
                <option value="normal">Normal - ${getCost('normal')}M (Equilibrado)</option>
                <option value="arriesgado">Arriesgado - ${getCost('arriesgado')}M (Mayor riesgo)</option>
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
              <Button type="submit" disabled={pendingRequests >= 2 || budget < getCost(mode) || isLoading}>
                {isLoading ? 'Enviando...' : 'Enviar al banco de pruebas'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Panel de Estadísticas Actuales */}
        <div className={styles.sideCol}>
          <Card title="Estadísticas Base" className={styles.statsCard}>
            <div className={styles.statRow}>
              <span>Potencia Base</span>
              <strong className="text-success-text">{engineStats.power}</strong>
            </div>
            <div className={styles.statRow}>
              <span>Fiabilidad Base</span>
              <strong className="text-accent-blue">{engineStats.reliability}</strong>
            </div>
          </Card>

          <Card title="Probabilidades (Simuladas)" className={styles.statsCard}>
            <p className="text-xs text-text-muted mb-4">
              Si envías <strong>{stat === 'power' ? 'potencia' : 'fiabilidad'}</strong> en modo <strong>{mode}</strong> con tu stat actual, 
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
