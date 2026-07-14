import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LFM_SEED } from '../../api/seed-data';
import styles from './EconomyDashboard.module.css';

const EconomyDashboard = () => {
  const { profile } = useAuth();
  
  // En producción vendría de Firebase
  const teamId = profile?.teamId || 'ferrari';
  const teamData = LFM_SEED.teams.find(t => t.id === teamId);
  const otherTeams = LFM_SEED.teams.filter(t => t.id !== teamId);
  
  const [destinationTeam, setDestinationTeam] = useState(otherTeams[0]?.id || '');
  const [amount, setAmount] = useState<number | ''>('');
  const [concept, setConcept] = useState('');

  const budget = teamData?.budgetRemainingM || 0;

  // Mock de solicitudes pasadas
  const requests = [
    { id: '1', date: '2026-07-10', to: 'williams', amount: 2.5, concept: 'Pago por motores', status: 'pending' },
    { id: '2', date: '2026-07-05', to: 'mclaren', amount: 1.0, concept: 'Acuerdo de pilotos', status: 'approved' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (numAmount <= 0 || numAmount > budget) {
      alert('Monto inválido.');
      return;
    }
    alert(`Solicitud de $${numAmount}M a ${destinationTeam} enviada. Concepto: ${concept}`);
    setAmount('');
    setConcept('');
  };

  const getTeamName = (id: string) => {
    const t = LFM_SEED.teams.find(team => team.id === id);
    return t ? t.name : id;
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
            <Button type="submit" disabled={!amount || Number(amount) <= 0 || Number(amount) > budget}>
              Enviar solicitud
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
            requests.map(req => (
              <div key={req.id} className={styles.historyRow}>
                <div className={styles.historyMain}>
                  <strong>Para {getTeamName(req.to)}</strong>
                  <span className={styles.concept}>{req.concept}</span>
                </div>
                <div className={styles.historyMeta}>
                  <strong className="text-lg">${req.amount}M</strong>
                  <span className={`${styles.statusPill} ${req.status === 'pending' ? styles.pending : styles.approved}`}>
                    {req.status === 'pending' ? 'Pendiente' : 'Aprobada'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EconomyDashboard;
