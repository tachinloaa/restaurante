# Sistema de Notificaciones

## Descripción

El sistema de notificaciones permite al administrador recibir alertas en tiempo real sobre eventos importantes del restaurante directamente en el dashboard.

## Características

### 🔔 Tipos de Notificaciones

- **nuevo_pedido** 🛒 - Nuevo pedido recibido
- **pedido_actualizado** 📦 - Estado de pedido actualizado
- **pedido_completado** ✅ - Pedido completado
- **pedido_cancelado** ❌ - Pedido cancelado
- **cliente_nuevo** 👤 - Nuevo cliente registrado
- **sistema** ℹ️ - Mensajes del sistema
- **alerta** ⚠️ - Alertas importantes

### 📱 Funcionalidades del Panel

- **Contador en tiempo real**: Badge en el icono de campana muestra notificaciones no leídas
- **Panel desplegable**: Click en la campana abre el panel de notificaciones
- **Marcar como leído**: Click individual o marcar todas
- **Eliminar**: Opción para eliminar notificaciones
- **Polling automático**: Actualización cada 30 segundos
- **Toast notifications**: Alertas emergentes para notificaciones muy recientes
- **Dark mode**: Soporte completo para tema oscuro
- **Responsive**: Adaptado para todos los dispositivos

## Estructura de Datos

### Tabla `notificaciones`

```sql
CREATE TABLE notificaciones (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  mensaje TEXT NOT NULL,
  datos_adicionales JSONB,
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### GET /api/notifications
Obtiene todas las notificaciones

**Query Parameters:**
- `limit` (opcional): Número máximo de notificaciones (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tipo": "nuevo_pedido",
      "mensaje": "Nuevo pedido #12345 - DOMICILIO - $250.00",
      "datos_adicionales": {
        "order_id": 1,
        "numero_pedido": 12345,
        "tipo_pedido": "DOMICILIO",
        "total": 250
      },
      "leida": false,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### GET /api/notifications/unread-count
Obtiene el conteo de notificaciones no leídas

**Response:**
```json
{
  "success": true,
  "data": { "count": 5 }
}
```

### PUT /api/notifications/:id/read
Marca una notificación como leída

**Response:**
```json
{
  "success": true,
  "data": { "id": 1, "leida": true, ... }
}
```

### PUT /api/notifications/read-all
Marca todas las notificaciones como leídas

**Response:**
```json
{
  "success": true,
  "data": { "count": 5 }
}
```

### DELETE /api/notifications/:id
Elimina una notificación

**Response:**
```json
{
  "success": true,
  "message": "Notificación eliminada correctamente"
}
```

### POST /api/notifications
Crea una nueva notificación

**Body:**
```json
{
  "tipo": "sistema",
  "mensaje": "Nueva actualización disponible",
  "datos_adicionales": { "version": "2.0.0" }
}
```

## Uso en el Frontend

### NotificationContext

```jsx
import { useNotifications } from '../context/NotificationContext';

function MyComponent() {
  const {
    notifications,     // Array de notificaciones
    unreadCount,       // Contador de no leídas
    loading,           // Estado de carga
    isOpen,            // Panel abierto/cerrado
    markAsRead,        // Marcar como leída
    markAllAsRead,     // Marcar todas como leídas
    deleteNotification, // Eliminar notificación
    togglePanel,       // Abrir/cerrar panel
  } = useNotifications();

  return (
    <div>
      <button onClick={togglePanel}>
        Notificaciones ({unreadCount})
      </button>
    </div>
  );
}
```

### NotificationPanel

El componente `NotificationPanel` se integra automáticamente en el Header y muestra:

- Lista de notificaciones con scroll
- Estados visuales (leída/no leída)
- Acciones rápidas (marcar, eliminar)
- Iconos y colores según tipo
- Fecha formateada
- Overlay de fondo

## Uso en el Backend

### NotificationService

```javascript
import NotificationService from '../services/notificationService.js';

// Crear notificación de nuevo pedido
await NotificationService.notificarNuevoPedidoPanel(pedido, cliente);

// Crear notificación de cambio de estado
await NotificationService.notificarCambioEstadoPedido(
  pedido, 
  'pendiente', 
  'en_preparacion'
);

// Crear notificación de nuevo cliente
await NotificationService.notificarNuevoCliente(cliente);

// Crear notificación de sistema/alerta
await NotificationService.notificarSistema(
  'Nueva versión disponible',
  { version: '2.0.0' },
  false // false=sistema, true=alerta
);

// Crear notificación personalizada
await NotificationService.crearNotificacion(
  'tipo_personalizado',
  'Mensaje personalizado',
  { datos: 'adicionales' }
);
```

## Configuración

### Intervalo de Polling

Para cambiar el intervalo de actualización automática, editar en `NotificationContext.jsx`:

```javascript
// Polling cada 30 segundos (30000 ms)
const interval = setInterval(() => {
  loadNotifications();
}, 30000);
```

### Tiempo de Toast

Para ajustar la duración de las notificaciones toast, editar en `main.jsx`:

```javascript
<Toaster 
  position="top-right"
  toastOptions={{
    duration: 3000, // 3 segundos
    // ...
  }}
/>
```

### Limpieza Automática

Las notificaciones leídas con más de 30 días se pueden limpiar automáticamente:

```javascript
import { cleanOldNotifications } from '../controllers/notificationController.js';

// Ejecutar como tarea programada (ej: cron job)
cleanOldNotifications();
```

## Mejores Prácticas

1. **Mensajes claros**: Usar mensajes descriptivos y concisos
2. **Datos adicionales**: Guardar IDs relevantes para navegación futura
3. **Tipos apropiados**: Usar el tipo correcto para cada notificación
4. **No spam**: Evitar crear notificaciones duplicadas
5. **Limpieza**: Implementar limpieza periódica de notificaciones antiguas

## Mantenimiento de la Base de Datos

### Ejecutar Script SQL

1. Conectar a Supabase
2. Ir a SQL Editor
3. Ejecutar el contenido de `docs/NOTIFICACIONES.sql`

### Verificar Tabla

```sql
-- Ver todas las notificaciones
SELECT * FROM notificaciones ORDER BY created_at DESC;

-- Contar no leídas
SELECT COUNT(*) FROM notificaciones WHERE leida = false;

-- Limpiar notificaciones antiguas leídas
DELETE FROM notificaciones 
WHERE leida = true 
  AND created_at < NOW() - INTERVAL '30 days';
```

## Troubleshooting

### Las notificaciones no aparecen

1. Verificar que la tabla `notificaciones` existe en Supabase
2. Revisar que las rutas están registradas en `routes/index.js`
3. Verificar consola del navegador para errores
4. Comprobar que el backend está corriendo

### El contador no se actualiza

1. Verificar que `NotificationProvider` está en `main.jsx`
2. Revisar que el polling está activo
3. Comprobar errores en DevTools Network

### Notificaciones duplicadas

1. Evitar crear notificaciones en loops
2. Verificar que no hay múltiples llamadas al mismo endpoint
3. Considerar debouncing en eventos frecuentes

## Próximas Mejoras

- [ ] WebSocket para notificaciones en tiempo real
- [ ] Notificaciones push (PWA)
- [ ] Categorías configurables
- [ ] Filtros por tipo
- [ ] Búsqueda de notificaciones
- [ ] Archivado de notificaciones
- [ ] Configuración de preferencias de usuario
