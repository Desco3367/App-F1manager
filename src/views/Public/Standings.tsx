
import { Card } from '../../components/ui/Card';
import { LFM_SEED } from '../../api/seed-data';
import styles from './Standings.module.css';

const Standings = () => {
  const { standings } = LFM_SEED.constructorChampionship;
  const { teams } = LFM_SEED;

  // Helper to get team name by id
  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : teamId;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Campeonato de Constructores</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Clasificación oficial de la temporada actual.</p>
      </header>

      <Card className={styles.standingsCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colPos}>Pos</th>
                <th className={styles.colTeam}>Equipo</th>
                <th className={styles.colPts}>Puntos</th>
                <th className={styles.colNotes}>Notas</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr key={row.teamId} className={styles.row}>
                  <td className={styles.colPos}>
                    <span className={`${styles.positionBadge} ${row.position <= 3 ? styles.top3 : ''}`}>
                      {row.position}
                    </span>
                  </td>
                  <td className={styles.colTeam}>
                    <div className={styles.teamInfo}>
                      <div className={styles.teamColor} data-team={row.teamId} />
                      <span className={styles.teamName}>{getTeamName(row.teamId)}</span>
                    </div>
                  </td>
                  <td className={styles.colPts}>
                    <span className={styles.points}>{row.points}</span>
                  </td>
                  <td className={styles.colNotes}>
                    {row.note || '-'}
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

export default Standings;
