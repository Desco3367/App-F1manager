
import { Card } from '../../components/ui/Card';
import { LFM_SEED } from '../../api/seed-data';
import styles from './Calendar.module.css';

const Calendar = () => {
  const { calendar } = LFM_SEED;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Calendario T7</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Conoce las fechas, circuitos y el estado de cada carrera.</p>
      </header>

      <div className={styles.grid}>
        {calendar.map((race) => (
          <Card key={race.id} className={styles.card}>
            {race.completed && (
              <div className={styles.badge}>
                FINALIZADO
              </div>
            )}
            <div className={styles.cardContent}>
              <div className={styles.roundBox}>
                {race.round}
              </div>
              <div>
                <h3 className={styles.raceName}>{race.gp}</h3>
                <p className={styles.raceType}>
                  {race.hasSprint ? 'Carrera + Sprint' : 'Carrera Normal'}
                </p>
              </div>
            </div>
            {race.completed ? (
              <div className={styles.actions}>
                <button className={styles.btnResults}>
                  Ver Resultados
                </button>
              </div>
            ) : (
              <div className={styles.actions}>
                <span className={styles.upcoming}>Próximamente</span>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
