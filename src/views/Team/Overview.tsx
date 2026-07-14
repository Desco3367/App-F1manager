import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { getTeams } from '../../api/db';
import { Team } from '../../types';

const Overview = () => {
  const { profile } = useAuth();
  
  const teamId = profile?.teamId || 'ferrari';
  const [teamData, setTeamData] = useState<Team | null>(null);
  const [motorClients, setMotorClients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTeam = async () => {
      const teams = await getTeams();
      const myTeam = teams.find(t => t.id === teamId);
      if (myTeam) {
        setTeamData(myTeam);
        if (myTeam.isMotorist) {
          const clients = teams.filter(t => !t.isMotorist && t.motoristId === teamId).map(t => t.name);
          setMotorClients(clients);
        }
      }
      setIsLoading(false);
    };
    loadTeam();
  }, [teamId]);

  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">Cargando datos del equipo...</div>;
  }

  if (!teamData) {
    return <div className="p-8 text-center text-danger-text">Equipo no encontrado.</div>;
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
      <Card title="Estado Financiero" className="glass-panel">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Presupuesto Restante</span>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--success-text)', fontFamily: 'var(--font-heading)' }}>
              ${teamData.budgetRemainingM}M
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Mánager Oficial</span>
            <div style={{ fontSize: '1.125rem', color: 'var(--text-primary)' }}>{teamData.principal || 'No asignado'}</div>
          </div>
        </div>
      </Card>

      <Card title="Acuerdo de Motor" className="glass-panel">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rol</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {teamData.isMotorist ? 'Motorista Oficial' : 'Equipo Cliente'}
            </div>
          </div>
          {!teamData.isMotorist && teamData.motoristId && (
            <div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Proveedor de Motor</span>
              <div style={{ fontSize: '1.125rem', color: 'var(--accent-blue)', textTransform: 'capitalize' }}>
                {teamData.motoristId}
              </div>
            </div>
          )}
          {teamData.isMotorist && motorClients.length > 0 && (
            <div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Clientes (Venta de Motores)</span>
              <div style={{ fontSize: '1.125rem', color: 'var(--text-primary)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {motorClients.map(client => (
                  <span key={client} style={{ background: 'var(--bg-surface-elevated)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem', textTransform: 'capitalize' }}>
                    {client}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Overview;
