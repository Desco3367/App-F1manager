import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LFM_SEED } from '../../api/seed-data';
import { getTeams, getCarByTeam, subscribeToWeightRequests, submitWeightRequest, updateTeamBudget } from '../../api/db';
import styles from './WeightsDashboard.module.css';

const WeightsDashboard = () => {
  const { profile } = useAuth();
  const [selectedPiece, setSelectedPiece] = useState(LFM_SEED.weightPieces[0].id);
  const [runs, setRuns] = useState(1);
  const [note, setNote] = useState('');

  const [budget, setBudget] = useState(0);
  const [teamLevels, setTeamLevels] = useState<Record<string, number>>({});
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const teamId = profile?.teamId || 'ferrari';

  useEffect(() => {
    const loadData = async () => {
      const teams = await getTeams();
      const myTeam = teams.find(t => t.id === teamId);
      if (myTeam) {
        setBudget(myTeam.budgetRemainingM);
      }

      const car = await getCarByTeam(teamId);
      if (car && car.weightLevels) {
        setTeamLevels(car.weightLevels);
      } else {
        // Inicializar con 0
        setTeamLevels({
          chassis: 0,
          aerodinamica: 0,
          fiabilidad: 0,
          frenos: 0,
          cajaCambios: 0,
          suspension: 0
        });
      }
      setIsLoading(false);
    };
    loadData();

    const unsubscribe = subscribeToWeightRequests((allReqs) => {
      const myPending = allReqs.filter(r => r.teamId === teamId && r.status === 'pending');
      setPendingRequests(myPending.length);
    });

    return () => unsubscribe();
  }, [teamId]);

  const getWeightCost = (numRuns: number) => {
    if (numRuns === 1) return 1.5;
    if (numRuns === 2) return 2.8;
    if (numRuns === 3) return 4.0;
    return 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = getWeightCost(runs);

    if (budget < cost) {
      alert('Presupuesto insuficiente para estas tiradas.');
      return;
    }
    if (pendingRequests >= 3) {
      alert('Tienes 3 solicitudes de peso pendientes, espera a que el administrador las resuelva.');
      return;
    }

    setIsLoading(true);
    const activeSeason = "season2026";
    const success = await submitWeightRequest(teamId, activeSeason, selectedPiece, runs, note || 'Sin nota');
    
    if (success) {
      const newBudget = budget - cost;
      await updateTeamBudget(teamId, newBudget);
      setBudget(newBudget);
      alert(`Solicitud de peso enviada: ${selectedPiece} - ${runs} tirada(s). Coste: $${cost}M`);
      setNote('');
    } else {
      alert('Error al enviar la solicitud de peso.');
    }
    setIsLoading(false);
  };

  const totalExtraWeight = LFM_SEED.weightPieces.reduce((acc, piece) => {
    const level = teamLevels[piece.id] || 0;
    const info = piece.levels.find(l => l.level === level) || piece.levels[0];
    return acc + info.weightKg;
  }, 0);

  const maxedPiecesCount = LFM_SEED.weightPieces.filter(p => (teamLevels[p.id] || 0) >= 10).length;

  if (isLoading && budget === 0) {
    return <div className="p-8 text-center text-text-muted">Cargando datos del coche...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Panel de Solicitud */}
      <Card title="Solicitar mejora de peso" className={styles.requestPanel}>
        <div className={styles.requestHeader}>
          <p className="text-text-secondary text-sm m-0">Pide tiradas de peso para el GP actual. Admin aplica el resultado y cobra el coste.</p>
          <span className={`${styles.pill} ${pendingRequests >= 3 ? styles.warnPill : ''}`}>
            {pendingRequests}/3 pendientes
          </span>
        </div>

        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label>Pieza</label>
            <select 
              value={selectedPiece} 
              onChange={(e) => setSelectedPiece(e.target.value)} 
              className={styles.input}
            >
              {LFM_SEED.weightPieces.map(p => {
                const isMaxed = (teamLevels[p.id] || 0) >= 10;
                return (
                  <option key={p.id} value={p.id} disabled={isMaxed}>
                    {p.name} {isMaxed ? '(Nivel Máx)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label>Tiradas</label>
            <select 
              value={runs} 
              onChange={(e) => setRuns(Number(e.target.value))} 
              className={styles.input}
            >
              <option value={1}>1 tirada - ${getWeightCost(1)}M</option>
              <option value={2}>2 tiradas - ${getWeightCost(2)}M</option>
              <option value={3}>3 tiradas - ${getWeightCost(3)}M</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label>Nota</label>
            <input 
              type="text" 
              maxLength={120} 
              placeholder="Ej: priorizar esta pieza para el GP..." 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.submitRow}>
            <Button type="submit" disabled={pendingRequests >= 3 || budget < getWeightCost(runs) || isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar solicitud'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Resumen Global */}
      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}>
          <span>Presupuesto Restante</span>
          <strong>${budget.toFixed(2)}M</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Peso extra total</span>
          <strong>{totalExtraWeight.toFixed(2)} kg</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Piezas en mínimo (Nivel 10)</span>
          <strong>{maxedPiecesCount}/{LFM_SEED.weightPieces.length}</strong>
        </div>
      </div>

      {/* Grid de Piezas */}
      <div className={styles.piecesGrid}>
        {LFM_SEED.weightPieces.map(piece => {
          const level = teamLevels[piece.id] || 0;
          const info = piece.levels.find(l => l.level === level) || piece.levels[0];
          const isMaxed = level >= 10;

          return (
            <div key={piece.id} className={styles.pieceCard}>
              <div className={styles.pieceHeader}>
                <span className={styles.pieceName}>{piece.name}</span>
                <span className={styles.pieceLevel}>Nivel {level}/10</span>
              </div>
              <div className={styles.pieceMeta}>
                <div className={styles.metaRow}>
                  <span className="text-text-muted">Peso extra</span>
                  <strong className="text-text-primary">{info.weightKg} kg</strong>
                </div>
                <div className={styles.metaRow}>
                  <span className="text-text-muted">Duración Mínima</span>
                  <strong className="text-text-primary">{info.durationMin}</strong>
                </div>
              </div>
              <div className={styles.pieceFooter}>
                {isMaxed ? (
                  <span className="text-success-text font-medium">Peso mínimo alcanzado</span>
                ) : (
                  <span className="text-text-secondary text-sm">
                    Éxito {info.successPct}% - Fallo {info.failurePct}% - Caída {info.dropPct}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeightsDashboard;
