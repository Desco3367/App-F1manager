import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LFM_SEED } from '../../api/seed-data';
import { getTeams, subscribeToWeightRequests, resolveWeightRequest, getCarByTeam } from '../../api/db';
import { WeightRequest, Team } from '../../types';

const WeightsAdmin = () => {
  const [requests, setRequests] = useState<WeightRequest[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const allTeams = await getTeams();
      setTeams(allTeams);
      setIsLoading(false);
    };
    loadData();

    const unsubscribe = subscribeToWeightRequests((allRequests) => {
      setRequests(allRequests);
    });

    return () => unsubscribe();
  }, []);

  const getWeightCost = (numRuns: number) => {
    if (numRuns === 1) return 1.5;
    if (numRuns === 2) return 2.8;
    if (numRuns === 3) return 4.0;
    return 0;
  };

  const handleRollDice = async (req: WeightRequest) => {
    // 1. Obtener el nivel actual de esta pieza
    const car = await getCarByTeam(req.teamId);
    if (!car) {
      alert("No se pudo obtener el coche del equipo.");
      return;
    }
    const currentLevel = car.weightLevels?.[req.pieceId] || 0;
    
    if (currentLevel >= 10) {
      alert("Esta pieza ya está al máximo nivel.");
      return;
    }

    // 2. Simulación de una tirada de dados para pesos (Éxito, Fallo, Caída)
    const resultTypes = ['Éxito (Sube de nivel)', 'Fallo (No sube)', 'Caída (Baja 1 nivel)'];
    const randomResultIndex = Math.floor(Math.random() * resultTypes.length);
    const resultText = resultTypes[randomResultIndex];
    
    let newLevel = currentLevel;
    if (randomResultIndex === 0) { // Exito
      newLevel = Math.min(10, currentLevel + req.runs); // Simplificado: sube 1 nivel por tirada si hay éxito global
    } else if (randomResultIndex === 2) { // Caída
      newLevel = Math.max(0, currentLevel - 1);
    }

    const confirmRoll = window.confirm(`Resultado de la tirada para ${req.pieceId}:\n\n🎲 ${resultText}\n\nNivel actual: ${currentLevel} -> Nivel nuevo: ${newLevel}\n\n¿Deseas aplicar este resultado?`);
    
    if (confirmRoll) {
      const success = await resolveWeightRequest(req.teamId, req.id, 'approved', newLevel, req.pieceId);
      if (success) {
        alert("Los stats han sido actualizados en la base de datos.");
      } else {
        alert("Error al guardar el nuevo nivel.");
      }
    }
  };

  const handleReject = async (reqId: string, teamId: string) => {
    const success = await resolveWeightRequest(teamId, reqId, 'rejected');
    if (success) {
      alert('Solicitud rechazada.');
    } else {
      alert('Error al rechazar solicitud.');
    }
  };

  const getTeamName = (id: string) => teams.find(t => t.id === id)?.name || id;

  const getPieceName = (pieceId: string) => {
    return LFM_SEED.weightPieces.find(p => p.id === pieceId)?.name || pieceId;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-text-primary">Administración de Pesos</h1>
        <p className="text-text-secondary mt-1">Ejecuta las tiradas matemáticas de reducción de peso para las piezas de los equipos.</p>
      </div>

      <Card title="Cola de Tiradas de Peso (En vivo)">
        {isLoading ? (
          <p className="text-text-muted">Cargando...</p>
        ) : requests.length === 0 ? (
          <p className="text-text-muted">No hay solicitudes de reducción de peso pendientes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-color text-text-muted text-sm uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium">Equipo</th>
                  <th className="py-3 px-4 font-medium">Pieza a Mejorar</th>
                  <th className="py-3 px-4 font-medium">Tiradas</th>
                  <th className="py-3 px-4 font-medium">Costo (Pagado)</th>
                  <th className="py-3 px-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} className="border-b border-border-color/50 hover:bg-bg-surface-elevated/50 transition-colors">
                    <td className="py-3 px-4 font-heading font-bold">{getTeamName(req.teamId)}</td>
                    <td className="py-3 px-4 text-accent-blue font-semibold">{getPieceName(req.pieceId)}</td>
                    <td className="py-3 px-4 font-mono">{req.runs}</td>
                    <td className="py-3 px-4">${getWeightCost(req.runs)}M</td>
                    <td className="py-3 px-4 text-right flex justify-end gap-2">
                      <Button variant="primary" onClick={() => handleRollDice(req)} className="!px-3 !py-1 text-sm">
                        🎲 Tirar Dados
                      </Button>
                      <Button variant="secondary" onClick={() => handleReject(req.id, req.teamId)} className="!px-3 !py-1 text-sm bg-danger-text/20 text-danger-text hover:bg-danger-text/30 border-none">
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
