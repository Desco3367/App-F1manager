import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getTeams, updateTeamBudget } from '../../api/db';
import { Team } from '../../types';

const TeamsDashboard = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [tempBudget, setTempBudget] = useState<number>(0);

  useEffect(() => {
    const loadTeams = async () => {
      setIsLoading(true);
      const data = await getTeams();
      setTeams(data);
      setIsLoading(false);
    };
    loadTeams();
  }, []);

  const handleEditBudget = (teamId: string, currentBudget: number) => {
    setEditingBudget(teamId);
    setTempBudget(currentBudget);
  };

  const handleSaveBudget = async (teamId: string) => {
    const success = await updateTeamBudget(teamId, tempBudget);
    if (success) {
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, budgetRemainingM: tempBudget } : t));
    } else {
      alert("Error al actualizar el presupuesto en la base de datos.");
    }
    setEditingBudget(null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-text-primary">Equipos y Mánagers</h1>
        <p className="text-text-secondary mt-1">Visión global de las escuderías, presupuestos y estado de motoristas.</p>
      </div>

      <Card title="Presupuestos (Temporada Actual)">
        {isLoading ? (
          <p className="text-text-muted">Cargando equipos desde la base de datos...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-color text-text-muted text-sm uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium">Escudería</th>
                  <th className="py-3 px-4 font-medium">Mánager</th>
                  <th className="py-3 px-4 font-medium">Estado</th>
                  <th className="py-3 px-4 font-medium">Presupuesto</th>
                  <th className="py-3 px-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {teams.map(team => (
                  <tr key={team.id} className="border-b border-border-color/50 hover:bg-bg-surface-elevated/50 transition-colors">
                    <td className="py-3 px-4 font-heading font-bold flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent-blue"></div>
                      {team.name}
                    </td>
                    <td className="py-3 px-4">{team.principal}</td>
                    <td className="py-3 px-4">
                      {team.isMotorist ? (
                        <span className="px-2 py-1 text-xs font-bold rounded bg-accent-red/20 text-accent-red">Motorista</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded bg-bg-surface-elevated text-text-secondary">Cliente</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-success-text text-lg">
                      {editingBudget === team.id ? (
                        <div className="flex items-center gap-1">
                          $ <input 
                              type="number" 
                              value={tempBudget} 
                              onChange={(e) => setTempBudget(Number(e.target.value))}
                              className="w-24 bg-bg-surface border border-border-color rounded px-2 py-1 text-text-primary"
                            /> M
                        </div>
                      ) : (
                        `$${team.budgetRemainingM}M`
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {editingBudget === team.id ? (
                        <div className="flex justify-end gap-2">
                          <Button variant="primary" onClick={() => handleSaveBudget(team.id)} className="!px-3 !py-1 text-sm bg-success-text text-bg-base hover:bg-success-text/90 border-none">
                            Guardar
                          </Button>
                          <Button variant="secondary" onClick={() => setEditingBudget(null)} className="!px-3 !py-1 text-sm">
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button variant="secondary" onClick={() => handleEditBudget(team.id, team.budgetRemainingM)} className="!px-3 !py-1 text-sm">
                          Editar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TeamsDashboard;
