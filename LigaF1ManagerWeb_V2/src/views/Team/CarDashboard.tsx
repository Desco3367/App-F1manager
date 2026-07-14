import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LFM_SEED } from '../../api/seed-data';
import { UpgradeRow } from './UpgradeRow';
import styles from './CarDashboard.module.css';

const CarDashboard = () => {
  const { profile } = useAuth();
  
  // Estado local para los puntos que el usuario quiere comprar
  const [designUpgrades, setDesignUpgrades] = useState<Record<string, number>>({
    aero: 0,
    chassis: 0,
    fiabilidad: 0,
  });
  
  const [researchUpgrades, setResearchUpgrades] = useState<Record<string, number>>({
    aero: 0,
    chassis: 0,
    fiabilidad: 0,
  });

  // Mock de datos del equipo y presupuesto (en prod vendría de Firebase)
  const teamId = profile?.teamId || 'ferrari';
  const teamData = LFM_SEED.teams.find(t => t.id === teamId);
  const budget = teamData?.budgetRemainingM || 0;
  
  const maxDevelopmentPoints = 40; // LFM_SEED.developmentLimitM

  // Costos base
  const getCost = (isResearch: boolean) => {
    // Valores de ejemplo. En app.js se calculaban dinámicamente o leían de config.
    if (isResearch) return 3; // Investigación cuesta 3M por punto
    return 4; // Diseño cuesta 4M por punto
  };

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

  // Cálculos totales
  const totalDesignPoints = Object.values(designUpgrades).reduce((a, b) => a + b, 0);
  const totalResearchPoints = Object.values(researchUpgrades).reduce((a, b) => a + b, 0);
  const totalPoints = totalDesignPoints + totalResearchPoints;

  const totalCost = 
    Object.entries(designUpgrades).reduce((acc, [, qty]) => acc + (qty * getCost(false)), 0) +
    Object.entries(researchUpgrades).reduce((acc, [, qty]) => acc + (qty * getCost(true)), 0);

  const isOverBudget = totalCost > budget;
  const isOverPoints = totalPoints > maxDevelopmentPoints;
  const canSave = totalPoints > 0 && !isOverBudget && !isOverPoints;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    alert(`Guardado. Costo total: $${totalCost}M.`);
    // Reiniciar
    setDesignUpgrades({ aero: 0, chassis: 0, fiabilidad: 0 });
    setResearchUpgrades({ aero: 0, chassis: 0, fiabilidad: 0 });
  };

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
              value={designUpgrades.fiabilidad} 
              cost={getCost(false)} 
              onIncrement={() => handleIncrement('design', 'fiabilidad')}
              onDecrement={() => handleDecrement('design', 'fiabilidad')}
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
              value={researchUpgrades.fiabilidad} 
              cost={getCost(true)} 
              onIncrement={() => handleIncrement('research', 'fiabilidad')}
              onDecrement={() => handleDecrement('research', 'fiabilidad')}
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
            disabled={!canSave}
            className={styles.saveBtn}
          >
            Confirmar Mejoras
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CarDashboard;
