import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LFM_SEED } from '../../api/seed-data';
import { subscribeToEngineRequests, resolveEngineRequest, getAllEngines, updateEngineStat } from '../../api/db';
import { Engine, EngineRequest } from '../../types';

const EngineAdmin = () => {
  const [requests, setRequests] = useState<EngineRequest[]>([]);
  const [engineStats, setEngineStats] = useState<Engine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Real-time subscription to engine requests
    const unsubscribe = subscribeToEngineRequests((realTimeRequests) => {
      setRequests(realTimeRequests);
    });

    // Load initial stats
    const loadStats = async () => {
      const engines = await getAllEngines();
      setEngineStats(engines);
      setIsLoading(false);
    };
    
    loadStats();

    return () => unsubscribe();
  }, []);

  const handleApprove = async (req: EngineRequest) => {
    const success = await resolveEngineRequest(req.teamId, req.id, 'approved');
    if (success) {
      alert('Solicitud de motor aprobada.');
    } else {
      alert('Error al aprobar solicitud.');
    }
  };

  const handleReject = async (req: EngineRequest) => {
    const success = await resolveEngineRequest(req.teamId, req.id, 'rejected');
    if (success) {
      alert('Solicitud rechazada. Se notificará al equipo.');
    } else {
      alert('Error al rechazar solicitud.');
    }
  };

  const handleStatChange = (teamId: string, stat: 'power' | 'reliability', value: number) => {
    setEngineStats(prev => prev.map(c => c.teamId === teamId ? { ...c, [stat]: value } : c));
  };

  const handleSaveStats = async (teamId: string) => {
    const stats = engineStats.find(c => c.teamId === teamId);
    if (!stats) return;

    const s1 = await updateEngineStat(teamId, 'power', stats.power);
    const s2 = await updateEngineStat(teamId, 'reliability', stats.reliability);

    if (s1 && s2) {
      alert(`Estadísticas de motor guardadas en la base de datos.`);
    } else {
      alert('Error al guardar estadísticas.');
    }
  };

  const getTeamName = (id: string) => LFM_SEED.teams.find(t => t.id === id)?.name || id;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-text-primary">Administración de Motores</h1>
        <p className="text-text-secondary mt-1">Aprobación de mejoras de motor y edición de estadísticas base para equipos motoristas.</p>
      </div>

      {/* Cola de Solicitudes */}
      <Card title="Cola de Solicitudes de Desarrollo (En vivo)">
        {requests.length === 0 ? (
          <p className="text-text-muted">No hay solicitudes pendientes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-color text-text-muted text-sm uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium">Equipo Motorista</th>
                  <th className="py-3 px-4 font-medium">Área</th>
                  <th className="py-3 px-4 font-medium">Nota / Tokens</th>
                  <th className="py-3 px-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} className="border-b border-border-color/50 hover:bg-bg-surface-elevated/50 transition-colors">
                    <td className="py-3 px-4 font-heading font-bold">{getTeamName(req.teamId)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${req.statId === 'power' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {req.statId === 'power' ? 'Potencia' : 'Fiabilidad'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary italic max-w-xs truncate" title={req.note}>
                      "{req.note}"
                    </td>
                    <td className="py-3 px-4 text-right flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => handleApprove(req)} className="!px-3 !py-1 text-sm bg-success-text/20 text-success-text hover:bg-success-text/30 border-none">
                        Aprobar
                      </Button>
                      <Button variant="secondary" onClick={() => handleReject(req)} className="!px-3 !py-1 text-sm bg-danger-text/20 text-danger-text hover:bg-danger-text/30 border-none">
                        Rechazar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Editor Manual de Stats */}
      <Card title="Editor Manual de Estadísticas de Motores">
        <p className="text-text-secondary text-sm mb-4">Modifica directamente los valores base de los motores en Firestore.</p>
        
        {isLoading ? (
          <p className="text-text-muted">Cargando motores...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-color text-text-muted text-sm uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium">Equipo Motorista</th>
                  <th className="py-3 px-4 font-medium">Potencia (HP)</th>
                  <th className="py-3 px-4 font-medium">Fiabilidad (%)</th>
                  <th className="py-3 px-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {engineStats.map(stat => (
                  <tr key={stat.teamId} className="border-b border-border-color/50 hover:bg-bg-surface-elevated/50 transition-colors">
                    <td className="py-3 px-4 font-heading font-bold">{getTeamName(stat.teamId)}</td>
                    <td className="py-3 px-4">
                      <input 
                        type="number"
                        className="bg-bg-base border border-border-color rounded px-2 py-1 text-text-primary w-24 focus:outline-none focus:border-orange-500 text-center font-mono"
                        value={stat.power}
                        onChange={(e) => handleStatChange(stat.teamId, 'power', Number(e.target.value))}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input 
                        type="number"
                        className="bg-bg-base border border-border-color rounded px-2 py-1 text-text-primary w-20 focus:outline-none focus:border-blue-500 text-center font-mono"
                        value={stat.reliability}
                        onChange={(e) => handleStatChange(stat.teamId, 'reliability', Number(e.target.value))}
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="secondary" onClick={() => handleSaveStats(stat.teamId)} className="!px-4 !py-1 text-sm">
                        Guardar
                      </Button>
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

export default EngineAdmin;
