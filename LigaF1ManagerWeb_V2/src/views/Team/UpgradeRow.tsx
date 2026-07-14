import React from 'react';
import styles from './UpgradeRow.module.css';

interface UpgradeRowProps {
  label: string;
  value: number;
  max?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  cost: number;
  discountedCost?: number;
}

export const UpgradeRow: React.FC<UpgradeRowProps> = ({ 
  label, value, max = 10, onIncrement, onDecrement, cost, discountedCost 
}) => {
  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <span className={styles.label}>{label}</span>
        <div className={styles.costBox}>
          {discountedCost !== undefined && discountedCost < cost ? (
            <>
              <span className={styles.originalCost}>${cost}M</span>
              <span className={styles.finalCost}>${discountedCost}M</span>
            </>
          ) : (
            <span className={styles.finalCost}>${cost}M</span>
          )}
        </div>
      </div>
      
      <div className={styles.controls}>
        <button 
          type="button" 
          className={styles.btn} 
          onClick={onDecrement}
          disabled={value <= 0}
        >
          -
        </button>
        <div className={styles.valueDisplay}>{value}</div>
        <button 
          type="button" 
          className={styles.btn} 
          onClick={onIncrement}
          disabled={value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
};
