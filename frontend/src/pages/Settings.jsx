import Card from '../components/Common/Card';

function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Configuración</h1>
        <p className="text-gray-600 mt-2">Ajustes del sistema</p>
      </div>

      <Card>
        <p className="text-gray-500">
          Configuración del sistema - En desarrollo
        </p>
      </Card>
    </div>
  );
}

export default Settings;
