import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LFM_SEED } from '../../api/seed-data';

const EngineAdmin = () => {
  // Mock requests data from teams
  const [requests, setRequests] = useState([
    { id: '1', teamId: 'ferrari', stat: 'Potencia Base', mode: 'Normal', note: 'Prueba de banco 1', costM: 3 },
    { id: '2', teamId: 'mercedes', stat: 'Fiabilidad Base', mode: 'Conservador', note: 'Prioridad fiabilidad', costM: 2 },
  ]);

  // Mock engine stats
  const [engineStats, setEngineStats] = useState(
    LFM_SEED.teams.filter(t => t.isMotorist).map(t => ({
      id: t.id,
      name: `Motor ${t.name}`,
      potencia: 85,
      fiabilidad: 90,
    }))
  );

  const handleRollDice = (reqId: string, stat: string) => {
    // Simulación de una tirada de dados (Éxito, Fallo, Rotura)
    const resultTypes = ['Gran Éxito (+2)', 'Éxito (+1)', 'Fallo (0)', 'Rotura (-1)'];
    const randomResult = resultTypes[Math.floor(Math.random() * resultTypes.length)];
    
    alert(`Resultado de la prueba en banco para ${stat}:\n\n🎲 ${randomResult}\n\nLos stats han sido actualizados y el costo descontado.`);
    setRequests(prev => prev.filter(r => r.id !== reqId));
  };

  const handleReject = (reqId: string) => {
    alert('Solicitud rechazada. Se notificará al equipo.');
    setRequests(prev => prev.filter(r => r.id !== reqId));
  };

  const handleStatChange = (teamId: string, stat: 'potencia' | 'fiabilidad', value: number) => {
    setEngineStats(prev => prev.map(e => e.id === teamId ? { ...e, [stat]: value } : e));
  };

  const handleSaveStats = (teamId: string) => {
    const stats = engineStats.find(e => e.id === teamId);
    alert(`Estadísticas de ${stats?.name} guardadas en la base de datos.`);
  };

  const getTeamName = (id: string) => LFM_SEED.teams.find(t => t.id === id)?.name || id;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-text-primary">Testeo de Motores</h1>
        <p className="text-text-secondary mt-1">Simula las pruebas de banco (tirada de dados) y edita las estadísticas base de los motoristas.</p>
      </div>

      {/* Cola de Pruebas de Banco */}
      <Card title="Cola de Pruebas de Banco">
        {requests.length === 0 ? (
          <p className="text-text-muted">No hay solicitudes de testeo de motor pendientes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-color text-text-muted text-sm uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium">Motorista</th>
                  <th className="py-3 px-4 font-medium">Estadística</th>
                  <th className="py-3 px-4 font-medium">Modo (Costo)</th>
                  <th className="py-3 px-4 font-medium">Nota</th>
                  <th className="py-3 px-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} className="border-b border-border-color/50 hover:bg-bg-surface-elevated/50 transition-colors">
                    <td className="py-3 px-4 font-heading font-bold">{getTeamName(req.teamId)}</td>
                    <td className="py-3 px-4 text-accent-blue font-semibold">{req.stat}</td>
                    <td className="py-3 px-4">
                      {req.mode} <span className="text-text-secondary">(${req.costM}M)</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary italic max-w-xs truncate" title={req.note}>
                      "{req.note}"
                    </td>
                    <td className="py-3 px-4 text-right flex justify-end gap-2">
                      <Button variant="primary" onClick={() => handleRollDice(req.id, req.stat)} className="!px-3 !py-1 text-sm">
                        🎲 Tirar Dados
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

      {/* Editor Manual de Stats del Motor */}
      <Card title="Estadísticas de Motores (Editor Manual)">
        <p className="text-text-secondary text-sm mb-4">Modifica los valores base de los motores directamente.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-color text-text-muted text-sm uppercase tracking-wider">
                <th className="py-3 px-4 font-medium">Motor</th>
                <th className="py-3 px-4 font-medium">Potencia</th>
                <th className="py-3 px-4 font-medium">Fiabilidad</th>
                <th className="py-3 px-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {engineStats.map(stat => (
                <tr key={stat.id} className="border-b border-border-color/50 hover:bg-bg-surface-elevated/50 transition-colors">
                  <td className="py-3 px-4 font-heading font-bold">{stat.name}</td>
                  <td className="py-3 px-4">
                    <input 
                      type="number"
                      className="bg-bg-base border border-border-color rounded px-2 py-1 text-text-primary w-24 focus:outline-none focus:border-accent-red text-center font-mono"
                      value={stat.potencia}
                      onChange={(e) => handleStatChange(stat.id, 'potencia', Number(e.target.value))}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input 
                      type="number"
                      className="bg-bg-base border border-border-color rounded px-2 py-1 text-text-primary w-24 focus:outline-none focus:border-accent-red text-center font-mono"
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

export default EngineAdmin;
