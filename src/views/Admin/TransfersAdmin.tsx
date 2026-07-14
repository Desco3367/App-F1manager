import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LFM_SEED } from '../../api/seed-data';

const TransfersAdmin = () => {
  // Mock transfer requests
  const [requests, setRequests] = useState([
    { id: '1', teamFrom: 'mercedes', teamTo: 'williams', amountM: 15, concept: 'Compra de caja de cambios' },
    { id: '2', teamFrom: 'redbull', teamTo: 'alphatauri', amountM: 20, concept: 'Apoyo financiero' },
  ]);

  const handleApprove = (reqId: string) => {
    alert('Transferencia aprobada.\nSe descontó el dinero del origen y se sumó al destino de manera automática.');
    setRequests(prev => prev.filter(r => r.id !== reqId));
  };

  const handleReject = (reqId: string) => {
    alert('Transferencia rechazada.');
    setRequests(prev => prev.filter(r => r.id !== reqId));
  };

  const getTeamName = (id: string) => LFM_SEED.teams.find(t => t.id === id)?.name || id;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-text-primary">Administración de Economía</h1>
        <p className="text-text-secondary mt-1">Aprobación de movimientos financieros y transferencias entre equipos.</p>
      </div>

      <Card title="Cola de Transferencias Pendientes">
        {requests.length === 0 ? (
          <p className="text-text-muted">No hay transferencias pendientes de aprobación.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-color text-text-muted text-sm uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium">Origen (Paga)</th>
                  <th className="py-3 px-4 font-medium text-center">Monto</th>
                  <th className="py-3 px-4 font-medium">Destino (Recibe)</th>
                  <th className="py-3 px-4 font-medium">Concepto</th>
                  <th className="py-3 px-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} className="border-b border-border-color/50 hover:bg-bg-surface-elevated/50 transition-colors">
                    <td className="py-3 px-4 font-heading font-bold text-danger-text">{getTeamName(req.teamFrom)}</td>
                    <td className="py-3 px-4 font-mono text-center font-bold text-accent-red text-lg">
                      ${req.amountM}M
                    </td>
                    <td className="py-3 px-4 font-heading font-bold text-success-text">{getTeamName(req.teamTo)}</td>
                    <td className="py-3 px-4 text-sm text-text-secondary italic max-w-xs truncate" title={req.concept}>
                      "{req.concept}"
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
    </div>
  );
};

export default TransfersAdmin;
