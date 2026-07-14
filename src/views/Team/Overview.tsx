import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { LFM_SEED } from '../../api/seed-data';

const Overview = () => {
  const { profile } = useAuth();
  
  // En producción real esto vendría de Firestore onSnapshot
  const teamId = profile?.teamId || 'ferrari';
  const teamData = LFM_SEED.teams.find(t => t.id === teamId);

  if (!teamData) {
    return <div>Cargando datos del equipo...</div>;
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
            <div style={{ fontSize: '1.125rem', color: 'var(--text-primary)' }}>{teamData.managerName}</div>
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
          {teamData.isMotorist && teamData.motorClients.length > 0 && (
            <div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Clientes (Venta de Motores)</span>
              <div style={{ fontSize: '1.125rem', color: 'var(--text-primary)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {teamData.motorClients.map(client => (
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
