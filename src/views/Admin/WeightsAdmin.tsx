import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LFM_SEED } from '../../api/seed-data';

const WeightsAdmin = () => {
  // Mock requests data from teams for weight improvements
  const [requests, setRequests] = useState([
    { id: '1', teamId: 'mclaren', piece: 'Chasis', currentLevel: 1, costM: 10.5, weightGoal: '9.0kg' },
    { id: '2', teamId: 'redbull', piece: 'Alerón delantero', currentLevel: 4, costM: 2.5, weightGoal: '2.4kg' },
  ]);

  const handleRollDice = (reqId: string, piece: string) => {
    // Simulación de una tirada de dados para pesos (Éxito, Fallo, Caída)
    const resultTypes = ['Éxito (Sube de nivel)', 'Fallo (No sube, pierde dinero)', 'Caída (Baja 1 nivel)'];
    const randomResult = resultTypes[Math.floor(Math.random() * resultTypes.length)];
    
    alert(`Resultado de la tirada de peso para ${piece}:\n\n🎲 ${randomResult}\n\nLos stats han sido actualizados en la base de datos.`);
    setRequests(prev => prev.filter(r => r.id !== reqId));
  };

  const handleReject = (reqId: string) => {
    alert('Solicitud rechazada.');
    setRequests(prev => prev.filter(r => r.id !== reqId));
  };

  const getTeamName = (id: string) => LFM_SEED.teams.find(t => t.id === id)?.name || id;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-text-primary">Administración de Pesos</h1>
        <p className="text-text-secondary mt-1">Ejecuta las tiradas matemáticas de reducción de peso para las piezas de los equipos.</p>
      </div>

      <Card title="Cola de Tiradas de Peso">
        {requests.length === 0 ? (
          <p className="text-text-muted">No hay solicitudes de reducción de peso pendientes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-color text-text-muted text-sm uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium">Equipo</th>
                  <th className="py-3 px-4 font-medium">Pieza a Mejorar</th>
                  <th className="py-3 px-4 font-medium">Nivel Actual</th>
                  <th className="py-3 px-4 font-medium">Costo Estimado</th>
                  <th className="py-3 px-4 font-medium">Objetivo de Peso</th>
                  <th className="py-3 px-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} className="border-b border-border-color/50 hover:bg-bg-surface-elevated/50 transition-colors">
                    <td className="py-3 px-4 font-heading font-bold">{getTeamName(req.teamId)}</td>
                    <td className="py-3 px-4 text-accent-blue font-semibold">{req.piece}</td>
                    <td className="py-3 px-4 font-mono">Paso {req.currentLevel}</td>
                    <td className="py-3 px-4">${req.costM}M</td>
                    <td className="py-3 px-4 font-bold text-success-text">{req.weightGoal}</td>
                    <td className="py-3 px-4 text-right flex justify-end gap-2">
                      <Button variant="primary" onClick={() => handleRollDice(req.id, req.piece)} className="!px-3 !py-1 text-sm">
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
    </div>
  );
};

export default WeightsAdmin;
