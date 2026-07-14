import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getTeams, submitTransferRequest, subscribeToTransferRequests } from '../../api/db';
import { TransferRequest, Team } from '../../types';
import styles from './EconomyDashboard.module.css';

const EconomyDashboard = () => {
  const { profile } = useAuth();
  const [budget, setBudget] = useState(0);
  const [otherTeams, setOtherTeams] = useState<Team[]>([]);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const teamId = profile?.teamId || 'ferrari';
  
  const [destinationTeam, setDestinationTeam] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [concept, setConcept] = useState('');

  useEffect(() => {
    const loadTeams = async () => {
      const teams = await getTeams();
      const myTeam = teams.find(t => t.id === teamId);
      if (myTeam) {
        setBudget(myTeam.budgetRemainingM);
      }
      
      const others = teams.filter(t => t.id !== teamId);
      setOtherTeams(others);
      if (others.length > 0) {
        setDestinationTeam(others[0].id);
      }
      setIsLoading(false);
    };

    loadTeams();

    const unsubscribe = subscribeToTransferRequests((allReqs) => {
      // Filtrar las peticiones donde el equipo sea el origen o el destino
      const myReqs = allReqs.filter(r => r.teamFrom === teamId || r.teamTo === teamId);
      setRequests(myReqs);
    });

    return () => unsubscribe();
  }, [teamId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (numAmount <= 0 || numAmount > budget) {
      alert('Monto inválido.');
      return;
    }
    
    setIsLoading(true);
    const success = await submitTransferRequest(teamId, destinationTeam, numAmount, concept);
    if (success) {
      alert(`Solicitud de $${numAmount}M a ${getTeamName(destinationTeam)} enviada exitosamente. Concepto: ${concept}`);
      setAmount('');
      setConcept('');
    } else {
      alert('Hubo un error al enviar la solicitud.');
    }
    setIsLoading(false);
  };

  const getTeamName = (id: string) => {
    const t = otherTeams.find(team => team.id === id);
    if (t) return t.name;
    if (id === teamId) return 'Tú'; // El equipo actual
    return id;
  };

  return (
    <div className={styles.container}>
      <Card title="Solicitar transferencia" className={styles.transferCard}>
        <div className={styles.headerRow}>
          <p className="text-sm text-text-secondary">
            La solicitud queda pendiente hasta que el admin la apruebe. No descuenta presupuesto hasta ser confirmada.
          </p>
          <div className={styles.budgetPill}>
            Saldo ${budget}M
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label>Equipo destino</label>
            <select 
              value={destinationTeam} 
              onChange={e => setDestinationTeam(e.target.value)}
              className={styles.input}
              required
            >
              {otherTeams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label>Monto en M</label>
            <input 
              type="number" 
              min="0.001" 
              max={budget} 
              step="0.001" 
              placeholder="Ej: 2.5"
              value={amount}
              onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label>Concepto</label>
            <input 
              type="text" 
              maxLength={140} 
              placeholder="Acuerdo, pago interno, compensación..." 
              value={concept}
              onChange={e => setConcept(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.submitRow}>
            <Button type="submit" disabled={!amount || Number(amount) <= 0 || Number(amount) > budget || isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar solicitud'}
            </Button>
          </div>
        </form>
      </Card>

      <div className={styles.historySection}>
        <h3 className="text-xl font-heading font-bold mb-4">Historial de Transferencias</h3>
        <div className={styles.historyList}>
          {requests.length === 0 ? (
            <p className="text-text-muted">No tienes solicitudes recientes.</p>
          ) : (
            requests.map(req => {
              const isOutgoing = req.teamFrom === teamId;
              
              return (
                <div key={req.id} className={styles.historyRow}>
                  <div className={styles.historyMain}>
                    <strong>
                      {isOutgoing 
                        ? `A: ${getTeamName(req.teamTo)}` 
                        : `De: ${getTeamName(req.teamFrom)}`
                      }
                    </strong>
                    <span className={styles.concept}>{req.concept}</span>
                  </div>
                  <div className={styles.historyMeta}>
                    <strong className={`text-lg ${isOutgoing ? 'text-danger-text' : 'text-success-text'}`}>
                      {isOutgoing ? '-' : '+'}${req.amountM}M
                    </strong>
                    <span className={`${styles.statusPill} ${req.status === 'pending' ? styles.pending : styles.approved}`}>
                      {req.status === 'pending' ? 'Pendiente' : req.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default EconomyDashboard;
