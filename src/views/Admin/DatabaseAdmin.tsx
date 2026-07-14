import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const DatabaseAdmin = () => {
  const handleBackup = () => {
    alert('Se ha generado un backup de la base de datos de Firebase. (Simulación)');
  };

  const handleResetSeason = () => {
    if (window.confirm('¿Estás SEGURO de que quieres resetear la temporada? Esto borrará el progreso actual e inicializará todos los presupuestos y stats a sus valores base. Esta acción no se puede deshacer.')) {
      alert('La temporada ha sido reseteada. (Simulación)');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-text-primary">Base de Datos</h1>
        <p className="text-text-secondary mt-1">Mantenimiento de la liga y gestión de respaldos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card title="Copias de Seguridad">
          <p className="text-text-secondary mb-4 text-sm">
            Genera un archivo JSON con el estado actual de todas las colecciones de la base de datos (Equipos, Pilotos, Calendario). Útil antes de hacer cambios drásticos.
          </p>
          <Button variant="secondary" onClick={handleBackup}>
            Generar Backup (JSON)
          </Button>
        </Card>

        <Card title="Mantenimiento de Temporada" className="border-danger-text/20">
          <p className="text-text-secondary mb-4 text-sm">
            Opciones avanzadas y peligrosas. Úsalas solo al finalizar una temporada o si necesitas purgar datos corruptos.
          </p>
          <Button variant="primary" onClick={handleResetSeason} className="bg-danger-text hover:bg-danger-text/90 w-full md:w-auto">
            ⚠ Resetear Temporada
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default DatabaseAdmin;
