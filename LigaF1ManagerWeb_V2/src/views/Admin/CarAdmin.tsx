import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LFM_SEED } from '../../api/seed-data';

const CarAdmin = () => {
  // Mock requests data
  const [requests, setRequests] = useState([
    { id: '1', teamId: 'ferrari', type: 'Diseño', piece: 'Aerodinámica', points: 2, note: 'Paquete de mejoras GP Austria', costM: 8 },
    { id: '2', teamId: 'williams', type: 'Investigación', piece: 'Chasis', points: 1, note: 'Proyecto 2027', costM: 3 },
  ]);

  // Mock car stats data
  const [carStats, setCarStats] = useState(
    LFM_SEED.teams.map(t => ({
      id: t.id,
      name: t.name,
      aero: 50,
      chassis: 45,
      fiabilidad: 60,
    }))
  );

  const handleApprove = (reqId: string) => {
    alert('Solicitud aprobada. Se descontó el presupuesto y se sumaron los puntos.');
    setRequests(prev => prev.filter(r => r.id !== reqId));
  };

  const handleReject = (reqId: string) => {
    alert('Solicitud rechazada. Se notificará al mánager.');
    setRequests(prev => prev.filter(r => r.id !== reqId));
  };

  const handleStatChange = (teamId: string, stat: 'aero' | 'chassis' | 'fiabilidad', value: number) => {
    setCarStats(prev => prev.map(c => c.id === teamId ? { ...c, [stat]: value } : c));
  };

  const handleSaveStats = (teamId: string) => {
    const stats = carStats.find(c => c.id === teamId);
    alert(`Estadísticas de ${stats?.name} guardadas en la base de datos.`);
  };

  const getTeamName = (id: string) => LFM_SEED.teams.find(t => t.id === id)?.name || id;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-text-primary">Administración de Coches</h1>
        <p className="text-text-secondary mt-1">Aprobación de mejoras y edición manual de estadísticas base.</p>
      </div>

      {/* Cola de Solicitudes */}
      <Card title="Cola de Solicitudes de Desarrollo">
        {requests.length === 0 ? (
          <p className="text-text-muted">No hay solicitudes pendientes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-color text-text-muted text-sm uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium">Equipo</th>
                  <th className="py-3 px-4 font-medium">Tipo</th>
                  <th className="py-3 px-4 font-medium">Pieza (Pts)</th>
                  <th className="py-3 px-4 font-medium">Costo</th>
                  <th className="py-3 px-4 font-medium">Nota del Mánager</th>
                  <th className="py-3 px-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} className="border-b border-border-color/50 hover:bg-bg-surface-elevated/50 transition-colors">
                    <td className="py-3 px-4 font-heading font-bold">{getTeamName(req.teamId)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${req.type === 'Diseño' ? 'bg-accent-blue/10 text-accent-blue' : 'bg-purple-500/10 text-purple-400'}`}>
                        {req.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {req.piece} <strong className="text-accent-red">(+{req.points})</strong>
                    </td>
                    <td className="py-3 px-4">${req.costM}M</td>
                    <td className="py-3 px-4 text-sm text-text-secondary italic max-w-xs truncate" title={req.note}>
                      "{req.note}"
                    </td>
                    <td className="py-3 px-4 text-right flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => handleApprove(req.id)} className="!px-3 !py-1 text-sm bg-success-text/20 text-success-text hover:bg-success-text/30 border-none">
                        Aprobar
                      </Button>
                      <Button variant="secondary" onClick={() => handleReject(req.id)} className="!px-3 !py-1 text-sm bg-danger-text/20 text-danger-text hover:bg-danger-text/30 border-none">
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
        <p className="text-text-secondary text-sm mb-4">Modifica directamente los valores base. Se recomienda usar esto solo para correcciones o inicialización.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-color text-text-muted text-sm uppercase tracking-wider">
                <th className="py-3 px-4 font-medium">Equipo</th>
                <th className="py-3 px-4 font-medium">Aerodinámica</th>
                <th className="py-3 px-4 font-medium">Chasis</th>
                <th className="py-3 px-4 font-medium">Fiabilidad</th>
                <th className="py-3 px-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {carStats.map(stat => (
                <tr key={stat.id} className="border-b border-border-color/50 hover:bg-bg-surface-elevated/50 transition-colors">
                  <td className="py-3 px-4 font-heading font-bold">{stat.name}</td>
                  <td className="py-3 px-4">
                    <input 
                      type="number"
                      className="bg-bg-base border border-border-color rounded px-2 py-1 text-text-primary w-20 focus:outline-none focus:border-accent-red text-center font-mono"
                      value={stat.aero}
                      onChange={(e) => handleStatChange(stat.id, 'aero', Number(e.target.value))}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input 
                      type="number"
                      className="bg-bg-base border border-border-color rounded px-2 py-1 text-text-primary w-20 focus:outline-none focus:border-accent-red text-center font-mono"
                      value={stat.chassis}
                      onChange={(e) => handleStatChange(stat.id, 'chassis', Number(e.target.value))}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input 
                      type="number"
                      className="bg-bg-base border border-border-color rounded px-2 py-1 text-text-primary w-20 focus:outline-none focus:border-accent-red text-center font-mono"
                      value={stat.fiabilidad}
                      onChange={(e) => handleStatChange(stat.id, 'fiabilidad', Number(e.target.value))}
                    />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="secondary" onClick={() => handleSaveStats(stat.id)} className="!px-4 !py-1 text-sm">
                      Guardar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default CarAdmin;
