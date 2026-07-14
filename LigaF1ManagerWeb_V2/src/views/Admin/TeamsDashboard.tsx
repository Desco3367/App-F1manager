import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LFM_SEED } from '../../api/seed-data';

const TeamsDashboard = () => {
  // Inicializamos estado local con la data mockeada de LFM_SEED.
  // En producción esto estaría suscrito a Firestore.
  const [teams, setTeams] = useState(LFM_SEED.teams.map(t => ({...t})));
  
  const handleBudgetChange = (teamId: string, newBudget: number) => {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, budgetRemainingM: newBudget } : t));
  };

  const handleSaveBudget = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    alert(`Presupuesto de ${team?.name} actualizado a $${team?.budgetRemainingM}M en la base de datos.`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-text-primary">Gestión de Equipos</h1>
          <p className="text-text-secondary mt-1">Modifica presupuestos y contratos de pilotos de los equipos inscritos.</p>
        </div>
      </div>

      <Card title="Presupuestos de Equipos">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-color text-text-muted text-sm uppercase tracking-wider">
                <th className="py-3 px-4 font-medium">Equipo</th>
                <th className="py-3 px-4 font-medium">Rol Motorista</th>
                <th className="py-3 px-4 font-medium">Presupuesto ($M)</th>
                <th className="py-3 px-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {teams.map(team => (
                <tr key={team.id} className="border-b border-border-color/50 hover:bg-bg-surface-elevated/50 transition-colors">
                  <td className="py-3 px-4 font-heading font-bold">{team.name}</td>
                  <td className="py-3 px-4 text-sm">
                    {team.isMotorist ? (
                      <span className="bg-accent-blue/10 text-accent-blue px-2 py-1 rounded text-xs font-semibold uppercase">Motorista</span>
                    ) : (
                      <span className="text-text-secondary">Cliente</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">$</span>
                      <input 
                        type="number"
                        step="0.001"
                        className="bg-bg-base border border-border-color rounded px-2 py-1 text-text-primary w-24 focus:outline-none focus:border-accent-red"
                        value={team.budgetRemainingM}
                        onChange={(e) => handleBudgetChange(team.id, Number(e.target.value))}
                      />
                      <span className="text-text-secondary">M</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button 
                      variant="secondary" 
                      onClick={() => handleSaveBudget(team.id)}
                    >
                      Guardar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Mercado de Pilotos (En construcción)">
        <p className="text-text-secondary text-sm">
          Aquí el administrador podrá vincular jugadores (Discord/Firebase UUID) a los asientos de los equipos y establecer sus salarios.
        </p>
      </Card>
    </div>
  );
};

export default TeamsDashboard;
