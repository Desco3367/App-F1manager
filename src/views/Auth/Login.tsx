import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../api/firebase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import styles from './Login.module.css';

const Login = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    
    try {
      await signInWithPopup(auth, provider);
      navigate('/team'); // Redirect to dashboard after login
    } catch (err: any) {
      console.error(err);
      setError('Error al iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.loginCard}>
        <div className={styles.header}>
          <div className={styles.logo}>F1</div>
          <h2>Acceso a la Liga</h2>
          <p>Identifícate con tu cuenta de Google vinculada a tu equipo.</p>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <div className={styles.actions}>
          <Button 
            onClick={handleGoogleLogin} 
            disabled={isLoading}
            className={styles.loginBtn}
          >
            {isLoading ? 'Conectando...' : 'Iniciar Sesión con Google'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Login;
