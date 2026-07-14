
import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, title, className = '' }) => {
  return (
    <div className={`${styles.card} ${className}`}>
      {title && <div className={styles.cardHeader}><h3>{title}</h3></div>}
      <div className={styles.cardBody}>
        {children}
      </div>
    </div>
  );
};
