import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { subscribeToCarRequests, resolveCarRequest, getAllCars, updateCarStat } from '../../api/db';
import { Car, CarRequest } from '../../types';
import { LFM_SEED } from '../../api/seed-data';

const CarAdmin = () => {
  const [requests, setRequests] = useState<CarRequest[]>([]);
  const [carStats, setCarStats] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Suscripción en tiempo real a las solicitudes
    const unsubscribe = subscribeToCarRequests((realTimeRequests) => {
      setRequests(realTimeRequests);
    });

    // Cargar stats iniciales
    const loadStats = async () => {
      const cars = await getAllCars();
      setCarStats(cars);
      setIsLoading(false);
    };
    
    loadStats();

    return () => unsubscribe();
  }, []);

  const handleApprove = async (req: CarRequest) => {
    // Aprobar solicitud
    const success = await resolveCarRequest(req.teamId, req.id, 'approved');
    if (success) {
      alert('Solicitud aprobada.');
    } else {
      alert('Error al aprobar solicitud.');
    }
  };

  const handleReject = async (req: CarRequest) => {
    const success = await resolveCarRequest(req.teamId, req.id, 'rejected');
    if (success) {
      alert('Solicitud rechazada. Se notificará al mánager.');
    } else {
      alert('Error al rechazar solicitud.');
    }
  };

  const handleStatChange = (teamId: string, stat: 'aero' | 'chassis' | 'reliability' | 'weight', value: number) => {
    setCarStats(prev => prev.map(c => c.teamId === teamId ? { ...c, [stat]: value } : c));
  };

  const handleSaveStats = async (teamId: string) => {
    const stats = carStats.find(c => c.teamId === teamId);
    if (!stats) return;
    
    const s1 = await updateCarStat(teamId, 'aero', stats.aero);
    const s2 = await updateCarStat(teamId, 'chassis', stats.chassis);
    const s3 = await updateCarStat(teamId, 'reliability', stats.reliability);
    const s4 = await updateCarStat(teamId, 'weight', stats.weight);

    if (s1 && s2 && s3 && s4) {
      alert(`Estadísticas de coche actualizadas en la base de datos.`);
    } else {
      alert('Error al guardar estadísticas.');
    }
  };

  const getTeamName = (id: string) => LFM_SEED.teams.find(t => t.id === id)?.name || id;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-text-primary">Administración de Coches</h1>
        <p className="text-text-secondary mt-1">Aprobación de mejoras y edición manual de estadísticas base.</p>
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
                  <th className="py-3 px-4 font-medium">Equipo</th>
                  <th className="py-3 px-4 font-medium">Modo</th>
                  <th className="py-3 px-4 font-medium">Pieza</th>
                  <th className="py-3 px-4 font-medium">Mejora</th>
                  <th className="py-3 px-4 font-medium">Nota del Mánager</th>
                  <th className="py-3 px-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} className="border-b border-border-color/50 hover:bg-bg-surface-elevated/50 transition-colors">
                    <td className="py-3 px-4 font-heading font-bold">{getTeamName(req.teamId)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${req.mode === 'design' ? 'bg-accent-blue/10 text-accent-blue' : 'bg-purple-500/10 text-purple-400'}`}>
                        {req.mode === 'design' ? 'Diseño' : 'Investigación'}
                      </span>
                    </td>
                    <td className="py-3 px-4 capitalize text-accent-red font-bold">
                      {req.pieceId}
                    </td>
                    <td className="py-3 px-4 text-success-text font-mono font-bold">
                      {req.upgradeType}
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
      <Card title="Editor Manual de Estadísticas de Coche">
        <p className="text-text-secondary text-sm mb-4">Modifica directamente los valores base en Firestore.</p>
        
        {isLoading ? (
          <p className="text-text-muted">Cargando estadísticas de coches...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-color text-text-muted text-sm uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium">Equipo</th>
                  <th className="py-3 px-4 font-medium">Aerodinámica</th>
                  <th className="py-3 px-4 font-medium">Chasis</th>
                  <th className="py-3 px-4 font-medium">Fiabilidad</th>
                  <th className="py-3 px-4 font-medium">Peso (kg)</th>
                  <th className="py-3 px-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {carStats.map(stat => (
                  <tr key={stat.teamId} className="border-b border-border-color/50 hover:bg-bg-surface-elevated/50 transition-colors">
                    <td className="py-3 px-4 font-heading font-bold">{getTeamName(stat.teamId)}</td>
                    <td className="py-3 px-4">
                      <input 
                        type="number"
                        className="bg-bg-base border border-border-color rounded px-2 py-1 text-text-primary w-20 focus:outline-none focus:border-accent-red text-center font-mono"
                        value={stat.aero}
                        onChange={(e) => handleStatChange(stat.teamId, 'aero', Number(e.target.value))}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input 
                        type="number"
                        className="bg-bg-base border border-border-color rounded px-2 py-1 text-text-primary w-20 focus:outline-none focus:border-accent-red text-center font-mono"
                        value={stat.chassis}
                        onChange={(e) => handleStatChange(stat.teamId, 'chassis', Number(e.target.value))}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input 
                        type="number"
                        className="bg-bg-base border border-border-color rounded px-2 py-1 text-text-primary w-20 focus:outline-none focus:border-accent-red text-center font-mono"
                        value={stat.reliability}
                        onChange={(e) => handleStatChange(stat.teamId, 'reliability', Number(e.target.value))}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input 
                        type="number"
                        step="0.1"
                        className="bg-bg-base border border-border-color rounded px-2 py-1 text-text-primary w-24 focus:outline-none focus:border-accent-red text-center font-mono"
                        value={stat.weight}
                        onChange={(e) => handleStatChange(stat.teamId, 'weight', Number(e.target.value))}
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

export default CarAdmin;
