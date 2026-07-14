
import { Card } from '../../components/ui/Card';
import { LFM_SEED } from '../../api/seed-data';
import styles from './Home.module.css';

const Home = () => {
  const { teams } = LFM_SEED;

  return (
    <div className={styles.homeContainer}>
      <header className={styles.header}>
        <h1 className="text-3xl font-bold mb-2">Parrilla Oficial</h1>
        <p className="text-text-secondary">Conoce a los equipos y su estado actual en la temporada.</p>
      </header>

      <div className={styles.grid}>
        {teams.map((team) => (
          <Card key={team.id} className={styles.teamCard}>
            <div className={styles.teamHeader}>
              <div className={styles.teamLogoPlaceholder} data-team={team.id}>
                {team.name.charAt(0)}
              </div>
              <div>
                <h2 className={styles.teamName}>{team.name}</h2>
                <p className={styles.managerName}>{team.managerName || 'Sin Mánager'}</p>
              </div>
            </div>
            
            <div className={styles.teamStats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Presupuesto</span>
                <span className={styles.statValue}>${team.budgetRemainingM}M</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Rol</span>
                <span className={styles.statValue}>
                  {team.isMotorist ? 'Motorista' : 'Cliente'}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Home;
