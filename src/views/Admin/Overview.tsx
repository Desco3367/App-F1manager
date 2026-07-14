import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const Overview = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-text-primary">Centro de Mandos</h1>
        <p className="text-text-secondary mt-1">Resumen general de la liga y notificaciones importantes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex flex-col items-center text-center !p-6 border-accent-red/20">
          <span className="text-4xl font-black text-accent-red mb-2">3</span>
          <span className="text-sm font-semibold uppercase text-text-secondary">Mejoras de Coche</span>
        </Card>
        
        <Card className="flex flex-col items-center text-center !p-6">
          <span className="text-4xl font-black text-text-primary mb-2">2</span>
          <span className="text-sm font-semibold uppercase text-text-secondary">Test de Motores</span>
        </Card>

        <Card className="flex flex-col items-center text-center !p-6 border-accent-blue/20">
          <span className="text-4xl font-black text-accent-blue mb-2">1</span>
          <span className="text-sm font-semibold uppercase text-text-secondary">Tirada de Pesos</span>
        </Card>

        <Card className="flex flex-col items-center text-center !p-6 border-success-text/20">
          <span className="text-4xl font-black text-success-text mb-2">2</span>
          <span className="text-sm font-semibold uppercase text-text-secondary">Transferencias</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card title="Estado del Mercado">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center p-4 bg-bg-surface-elevated rounded">
              <div>
                <h4 className="font-bold text-text-primary">Ventana de Desarrollo (Coches)</h4>
                <p className="text-sm text-text-secondary">Permite a los mánagers pedir diseño e investigación.</p>
              </div>
              <Button variant="secondary" className="!text-success-text bg-success-text/10">Abierta</Button>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-bg-surface-elevated rounded">
              <div>
                <h4 className="font-bold text-text-primary">Ventana de Transferencias</h4>
                <p className="text-sm text-text-secondary">Permite el movimiento de dinero entre equipos.</p>
              </div>
              <Button variant="secondary" className="!text-danger-text bg-danger-text/10">Cerrada</Button>
            </div>
          </div>
        </Card>

        <Card title="Progreso de la Temporada">
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="w-full bg-bg-surface-elevated rounded-full h-4 mb-4 overflow-hidden">
              <div className="bg-accent-red h-4 rounded-full" style={{ width: '40%' }}></div>
            </div>
            <p className="text-lg font-bold text-text-primary">Gran Premio 8 de 20</p>
            <p className="text-text-secondary text-sm">Estado: En curso</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Overview;
