import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { UpgradeRow } from './UpgradeRow';
import { submitCarRequest, getTeams, updateTeamBudget } from '../../api/db';
import styles from './CarDashboard.module.css';

const CarDashboard = () => {
  const { profile } = useAuth();
  const [budget, setBudget] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado local para los puntos que el usuario quiere comprar
  const [designUpgrades, setDesignUpgrades] = useState<Record<string, number>>({
    aero: 0,
    chassis: 0,
    reliability: 0,
  });
  
  const [researchUpgrades, setResearchUpgrades] = useState<Record<string, number>>({
    aero: 0,
    chassis: 0,
    reliability: 0,
  });

  const teamId = profile?.teamId || 'ferrari'; // Fallback for dev

  useEffect(() => {
    const loadTeamData = async () => {
      const teams = await getTeams();
      const myTeam = teams.find(t => t.id === teamId);
      if (myTeam) {
        setBudget(myTeam.budgetRemainingM);
      }
      setIsLoading(false);
    };
    loadTeamData();
  }, [teamId]);
  
  const maxDevelopmentPoints = 40;

  const getCost = (isResearch: boolean) => isResearch ? 3 : 4;

  const handleIncrement = (type: 'design' | 'research', pieceId: string) => {
    if (type === 'design') {
      setDesignUpgrades(prev => ({ ...prev, [pieceId]: prev[pieceId] + 1 }));
    } else {
      setResearchUpgrades(prev => ({ ...prev, [pieceId]: prev[pieceId] + 1 }));
    }
  };

  const handleDecrement = (type: 'design' | 'research', pieceId: string) => {
    if (type === 'design') {
      setDesignUpgrades(prev => ({ ...prev, [pieceId]: Math.max(0, prev[pieceId] - 1) }));
    } else {
      setResearchUpgrades(prev => ({ ...prev, [pieceId]: Math.max(0, prev[pieceId] - 1) }));
    }
  };

  const totalDesignPoints = Object.values(designUpgrades).reduce((a, b) => a + b, 0);
  const totalResearchPoints = Object.values(researchUpgrades).reduce((a, b) => a + b, 0);
  const totalPoints = totalDesignPoints + totalResearchPoints;

  const totalCost = 
    Object.entries(designUpgrades).reduce((acc, [, qty]) => acc + (qty * getCost(false)), 0) +
    Object.entries(researchUpgrades).reduce((acc, [, qty]) => acc + (qty * getCost(true)), 0);

  const isOverBudget = totalCost > budget;
  const isOverPoints = totalPoints > maxDevelopmentPoints;
  const canSave = totalPoints > 0 && !isOverBudget && !isOverPoints;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    setIsLoading(true);

    const activeSeason = "season2026"; // TODO: read from settings
    
    // Submit Design requests
    for (const [pieceId, qty] of Object.entries(designUpgrades)) {
      if (qty > 0) {
        await submitCarRequest(teamId, activeSeason, 'design', pieceId, `+${qty} puntos`, 'Enviado desde V2');
      }
    }

    // Submit Research requests
    for (const [pieceId, qty] of Object.entries(researchUpgrades)) {
      if (qty > 0) {
        await submitCarRequest(teamId, activeSeason, 'research', pieceId, `+${qty} puntos`, 'Enviado desde V2');
      }
    }

    // Descontar presupuesto
    const newBudget = budget - totalCost;
    await updateTeamBudget(teamId, newBudget);
    setBudget(newBudget);

    alert(`Solicitudes enviadas exitosamente al administrador. Costo total: $${totalCost}M.`);
    
    setDesignUpgrades({ aero: 0, chassis: 0, reliability: 0 });
    setResearchUpgrades({ aero: 0, chassis: 0, reliability: 0 });
    setIsLoading(false);
  };

  if (isLoading && budget === 0) {
    return <div className="p-8 text-center">Cargando datos del equipo...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {/* Columna Diseño */}
        <Card title="Diseño Actual (Para el coche actual)" className={styles.columnCard}>
          <p className="text-text-secondary text-sm mb-4">
            Mejora el rendimiento de tu coche para las próximas carreras de esta temporada.
          </p>
          <div className={styles.upgradesList}>
            <UpgradeRow 
              label="Aerodinámica" 
              value={designUpgrades.aero} 
              cost={getCost(false)} 
              onIncrement={() => handleIncrement('design', 'aero')}
              onDecrement={() => handleDecrement('design', 'aero')}
            />
            <UpgradeRow 
              label="Chasis" 
              value={designUpgrades.chassis} 
              cost={getCost(false)} 
              onIncrement={() => handleIncrement('design', 'chassis')}
              onDecrement={() => handleDecrement('design', 'chassis')}
            />
            <UpgradeRow 
              label="Fiabilidad" 
              value={designUpgrades.reliability} 
              cost={getCost(false)} 
              onIncrement={() => handleIncrement('design', 'reliability')}
              onDecrement={() => handleDecrement('design', 'reliability')}
            />
          </div>
        </Card>

        {/* Columna Investigación */}
        <Card title="Investigación (Próxima Temporada)" className={styles.columnCard}>
          <p className="text-text-secondary text-sm mb-4">
            Desarrolla el coche del próximo año. Estas mejoras no aplican a la temporada actual.
          </p>
          <div className={styles.upgradesList}>
            <UpgradeRow 
              label="Aerodinámica" 
              value={researchUpgrades.aero} 
              cost={getCost(true)} 
              onIncrement={() => handleIncrement('research', 'aero')}
              onDecrement={() => handleDecrement('research', 'aero')}
            />
            <UpgradeRow 
              label="Chasis" 
              value={researchUpgrades.chassis} 
              cost={getCost(true)} 
              onIncrement={() => handleIncrement('research', 'chassis')}
              onDecrement={() => handleDecrement('research', 'chassis')}
            />
            <UpgradeRow 
              label="Fiabilidad" 
              value={researchUpgrades.reliability} 
              cost={getCost(true)} 
              onIncrement={() => handleIncrement('research', 'reliability')}
              onDecrement={() => handleDecrement('research', 'reliability')}
            />
          </div>
        </Card>
      </div>

      {/* Footer Fijo de Resumen y Guardado */}
      <div className={styles.summaryFooter}>
        <div className={styles.summaryStats}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Presupuesto Restante</span>
            <span className={styles.statValue}>${budget}M</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Límite de Desarrollo</span>
            <span className={`${styles.statValue} ${isOverPoints ? styles.dangerText : ''}`}>
              {totalPoints} / {maxDevelopmentPoints} pts
            </span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Costo Total a Invertir</span>
            <span className={`${styles.statValue} ${isOverBudget ? styles.dangerText : styles.accentText}`}>
              ${totalCost}M
            </span>
          </div>
        </div>

        <div className={styles.actionsBox}>
          {isOverBudget && <span className={styles.errorText}>No tienes suficiente presupuesto.</span>}
          {isOverPoints && <span className={styles.errorText}>Has superado el límite de puntos.</span>}
          
          <Button 
            onClick={handleSubmit} 
            disabled={!canSave || isLoading}
            className={styles.saveBtn}
          >
            {isLoading ? 'Procesando...' : 'Confirmar Mejoras'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CarDashboard;
