/**
 * Página de Configuración - Ajustes del sistema del restaurante
 * 
 * Secciones:
 * - Información del restaurante
 * - Notificaciones
 * - Preferencias del sistema
 * - Integración WhatsApp
 * - Apariencia
 */
import { useState } from 'react';
import { Save, Store, Bell, Settings as SettingsIcon, MessageSquare, Palette } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Common/Card';
import toast from 'react-hot-toast';

function Settings() {
  const { isDark, toggleTheme } = useTheme();
  
  // Estado para información del restaurante
  const [restaurantInfo, setRestaurantInfo] = useState({
    nombre: 'El Rinconcito',
    direccion: 'Calle Principal #123, Col. Centro',
    telefono: '+52 55 1234 5678',
    email: 'contacto@elrinconcito.com',
    horario_apertura: '09:00',
    horario_cierre: '22:00',
    dias_operacion: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  });

  // Estado para notificaciones
  const [notificationSettings, setNotificationSettings] = useState({
    nuevo_pedido: true,
    cambio_estado: true,
    nuevo_cliente: true,
    sonido: true,
    escritorio: false
  });

  // Estado para preferencias del sistema
  const [systemPreferences, setSystemPreferences] = useState({
    idioma: 'es',
    zona_horaria: 'America/Mexico_City',
    formato_moneda: 'MXN',
    formato_fecha: 'dd/MM/yyyy'
  });

  // Estado para WhatsApp/Twilio
  const [whatsappConfig, setWhatsappConfig] = useState({
    numero_cliente: '',
    numero_admin: '',
    activo: false
  });

  /**
   * Guarda la configuración del restaurante
   */
  const handleSaveRestaurantInfo = async (e) => {
    e.preventDefault();
    try {
      // Aquí iría la llamada a la API
      // await api.put('/settings/restaurant', restaurantInfo);
      
      toast.success('Información del restaurante actualizada');
    } catch (error) {
      toast.error('Error al guardar la información');
    }
  };

  /**
   * Guarda las preferencias de notificaciones
   */
  const handleSaveNotifications = async () => {
    try {
      // await api.put('/settings/notifications', notificationSettings);
      toast.success('Preferencias de notificaciones guardadas');
    } catch (error) {
      toast.error('Error al guardar las preferencias');
    }
  };

  /**
   * Guarda las preferencias del sistema
   */
  const handleSaveSystemPreferences = async () => {
    try {
      // await api.put('/settings/system', systemPreferences);
      toast.success('Preferencias del sistema guardadas');
    } catch (error) {
      toast.error('Error al guardar las preferencias');
    }
  };

  /**
   * Guarda la configuración de WhatsApp
   */
  const handleSaveWhatsApp = async (e) => {
    e.preventDefault();
    try {
      // await api.put('/settings/whatsapp', whatsappConfig);
      toast.success('Configuración de WhatsApp actualizada');
    } catch (error) {
      toast.error('Error al guardar la configuración');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Configuración
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
          Ajustes y preferencias del sistema
        </p>
      </div>

      {/* Grid de secciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Información del Restaurante */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Store className="text-red-600 dark:text-red-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Información del Restaurante
            </h2>
          </div>

          <form onSubmit={handleSaveRestaurantInfo} className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre del Restaurante
              </label>
              <input
                type="text"
                value={restaurantInfo.nombre}
                onChange={(e) => setRestaurantInfo({...restaurantInfo, nombre: e.target.value})}
                className="input w-full"
                required
              />
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dirección
              </label>
              <input
                type="text"
                value={restaurantInfo.direccion}
                onChange={(e) => setRestaurantInfo({...restaurantInfo, direccion: e.target.value})}
                className="input w-full"
              />
            </div>

            {/* Teléfono y Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={restaurantInfo.telefono}
                  onChange={(e) => setRestaurantInfo({...restaurantInfo, telefono: e.target.value})}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={restaurantInfo.email}
                  onChange={(e) => setRestaurantInfo({...restaurantInfo, email: e.target.value})}
                  className="input w-full"
                />
              </div>
            </div>

            {/* Horarios */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hora de Apertura
                </label>
                <input
                  type="time"
                  value={restaurantInfo.horario_apertura}
                  onChange={(e) => setRestaurantInfo({...restaurantInfo, horario_apertura: e.target.value})}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hora de Cierre
                </label>
                <input
                  type="time"
                  value={restaurantInfo.horario_cierre}
                  onChange={(e) => setRestaurantInfo({...restaurantInfo, horario_cierre: e.target.value})}
                  className="input w-full"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full">
              <Save size={18} />
              Guardar Información
            </button>
          </form>
        </Card>

        {/* Notificaciones */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Bell className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Notificaciones
            </h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configura qué notificaciones deseas recibir
            </p>

            {/* Toggle switches para cada tipo de notificación */}
            <div className="space-y-3">
              {/* Nuevo Pedido */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Nuevos Pedidos</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Notificar cuando llega un pedido</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.nuevo_pedido}
                    onChange={(e) => setNotificationSettings({...notificationSettings, nuevo_pedido: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Cambio de Estado */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Cambios de Estado</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Actualización de pedidos</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.cambio_estado}
                    onChange={(e) => setNotificationSettings({...notificationSettings, cambio_estado: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Nuevos Clientes */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Nuevos Clientes</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cliente registrado</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.nuevo_cliente}
                    onChange={(e) => setNotificationSettings({...notificationSettings, nuevo_cliente: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Sonido */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Sonido</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Reproducir sonido</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.sonido}
                    onChange={(e) => setNotificationSettings({...notificationSettings, sonido: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <button
              onClick={handleSaveNotifications}
              className="btn btn-primary w-full"
            >
              <Save size={18} />
              Guardar Preferencias
            </button>
          </div>
        </Card>

        {/* Preferencias del Sistema */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <SettingsIcon className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Preferencias del Sistema
            </h2>
          </div>

          <div className="space-y-4">
            {/* Idioma */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Idioma
              </label>
              <select
                value={systemPreferences.idioma}
                onChange={(e) => setSystemPreferences({...systemPreferences, idioma: e.target.value})}
                className="input w-full"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Zona Horaria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Zona Horaria
              </label>
              <select
                value={systemPreferences.zona_horaria}
                onChange={(e) => setSystemPreferences({...systemPreferences, zona_horaria: e.target.value})}
                className="input w-full"
              >
                <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                <option value="America/Cancun">Cancún (GMT-5)</option>
                <option value="America/Monterrey">Monterrey (GMT-6)</option>
                <option value="America/Tijuana">Tijuana (GMT-8)</option>
              </select>
            </div>

            {/* Formato de Moneda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Moneda
              </label>
              <select
                value={systemPreferences.formato_moneda}
                onChange={(e) => setSystemPreferences({...systemPreferences, formato_moneda: e.target.value})}
                className="input w-full"
              >
                <option value="MXN">Peso Mexicano (MXN)</option>
                <option value="USD">Dólar Americano (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>

            {/* Formato de Fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Formato de Fecha
              </label>
              <select
                value={systemPreferences.formato_fecha}
                onChange={(e) => setSystemPreferences({...systemPreferences, formato_fecha: e.target.value})}
                className="input w-full"
              >
                <option value="dd/MM/yyyy">DD/MM/AAAA</option>
                <option value="MM/dd/yyyy">MM/DD/AAAA</option>
                <option value="yyyy-MM-dd">AAAA-MM-DD</option>
              </select>
            </div>

            <button
              onClick={handleSaveSystemPreferences}
              className="btn btn-primary w-full"
            >
              <Save size={18} />
              Guardar Preferencias
            </button>
          </div>
        </Card>

        {/* Apariencia */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
              <Palette className="text-pink-600 dark:text-pink-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Apariencia
            </h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Personaliza la apariencia de la aplicación
            </p>

            {/* Tema */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Modo Oscuro</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isDark ? 'Tema oscuro activado' : 'Tema claro activado'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDark}
                  onChange={toggleTheme}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                El modo oscuro reduce el brillo de la pantalla y es más cómodo para la vista en entornos con poca luz.
              </p>
            </div>
          </div>
        </Card>

        {/* Integración WhatsApp (ocupa ancho completo) */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <MessageSquare className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Integración WhatsApp
            </h2>
          </div>

          <form onSubmit={handleSaveWhatsApp} className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Nota:</strong> Esta configuración requiere una cuenta de Twilio activa. 
                Consulta la documentación en <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">docs/TWILIO_SETUP.md</code>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Número para Clientes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Número WhatsApp (Clientes)
                </label>
                <input
                  type="text"
                  value={whatsappConfig.numero_cliente}
                  onChange={(e) => setWhatsappConfig({...whatsappConfig, numero_cliente: e.target.value})}
                  placeholder="whatsapp:+14155238886"
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Número de Twilio para recibir pedidos
                </p>
              </div>

              {/* Número para Admin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Número WhatsApp (Admin)
                </label>
                <input
                  type="text"
                  value={whatsappConfig.numero_admin}
                  onChange={(e) => setWhatsappConfig({...whatsappConfig, numero_admin: e.target.value})}
                  placeholder="+52 55 1234 5678"
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Tu número para recibir notificaciones
                </p>
              </div>
            </div>

            {/* Activar WhatsApp */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Estado de WhatsApp</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {whatsappConfig.activo ? 'Bot de WhatsApp activo' : 'Bot de WhatsApp inactivo'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsappConfig.activo}
                  onChange={(e) => setWhatsappConfig({...whatsappConfig, activo: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            <button type="submit" className="btn btn-primary w-full">
              <Save size={18} />
              Guardar Configuración de WhatsApp
            </button>
          </form>
        </Card>

      </div>
    </div>
  );
}

export default Settings;
