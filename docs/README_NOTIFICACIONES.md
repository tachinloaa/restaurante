# 🔔 Sistema de Notificaciones - Instalación y Uso

## 📋 Resumen de Implementación

Se ha desarrollado un **sistema completo de notificaciones en tiempo real** para el panel de administración del restaurante.

### ✨ Características Implementadas

- ✅ Panel desplegable de notificaciones en el header
- ✅ Badge con contador de notificaciones no leídas
- ✅ Notificaciones automáticas para nuevos pedidos
- ✅ Notificaciones de cambios de estado de pedidos
- ✅ Notificaciones de nuevos clientes
- ✅ Sistema de alertas y mensajes del sistema
- ✅ Polling automático cada 30 segundos
- ✅ Toast notifications para alertas recientes
- ✅ Marcar como leída (individual o todas)
- ✅ Eliminar notificaciones
- ✅ Soporte completo de dark mode
- ✅ Diseño responsive para todos los dispositivos
- ✅ Backend con API RESTful completa

## 🚀 Instalación Rápida

### 1. Crear la Tabla en Supabase

1. Accede a tu dashboard de Supabase
2. Ve a **SQL Editor**
3. Copia y pega el contenido completo del archivo: `docs/INSTALL_NOTIFICACIONES.sql`
4. Ejecuta el script
5. Verifica que la tabla se creó correctamente

**Archivo a ejecutar:** [INSTALL_NOTIFICACIONES.sql](./INSTALL_NOTIFICACIONES.sql)

### 2. Verificar Instalación del Frontend

Las dependencias ya están instaladas. Verifica que el servidor está corriendo:

```bash
cd frontend
npm run dev
```

**Dependencia instalada:** `react-hot-toast` ✅

### 3. Verificar Backend

El backend ya está actualizado con todas las rutas necesarias:

```bash
cd backend
npm run dev
```

## 📁 Archivos Creados/Modificados

### Frontend (Nuevos)
- `src/context/NotificationContext.jsx` - Contexto global de notificaciones
- `src/components/Notifications/NotificationPanel.jsx` - Panel desplegable
- `src/services/notificationService.js` - Servicio API

### Frontend (Modificados)
- `src/main.jsx` - Integración de NotificationProvider y Toaster
- `src/components/Layout/Header.jsx` - Badge y panel de notificaciones

### Backend (Nuevos)
- `src/controllers/notificationController.js` - Controlador completo
- `src/routes/notificationRoutes.js` - Rutas de API

### Backend (Modificados)
- `src/routes/index.js` - Registro de rutas de notificaciones
- `src/services/notificationService.js` - Funciones para crear notificaciones
- `src/controllers/orderController.js` - Integración con pedidos
- `src/config/database.js` - Exportación correcta de supabase

### Documentación
- `docs/NOTIFICACIONES.md` - Guía completa del sistema
- `docs/NOTIFICACIONES.sql` - Script SQL (versión simplificada)
- `docs/INSTALL_NOTIFICACIONES.sql` - Script SQL de instalación completo
- `docs/README_NOTIFICACIONES.md` - Este archivo

## 🎯 Uso del Sistema

### En el Dashboard

1. **Ver notificaciones:**
   - Click en el icono de campana 🔔 en el header
   - El badge muestra el número de notificaciones no leídas

2. **Marcar como leída:**
   - Click en el checkmark ✓ verde de cada notificación
   - O usa el botón de "Marcar todas" en el header del panel

3. **Eliminar:**
   - Click en el icono de basura 🗑️ de cada notificación

### Notificaciones Automáticas

El sistema crea notificaciones automáticamente cuando:

- 🛒 Se recibe un **nuevo pedido**
- 📦 Cambia el **estado de un pedido**
- ✅ Se **completa** un pedido
- ❌ Se **cancela** un pedido
- 👤 Se registra un **nuevo cliente**

### Toast Notifications

Las notificaciones muy recientes (últimos 30 segundos) también se muestran como toast emergentes en la esquina superior derecha.

## 🔧 API Endpoints

### GET `/api/notifications`
Obtiene todas las notificaciones

**Query params:**
- `limit` (opcional): Número máximo de resultados (default: 50)

### GET `/api/notifications/unread-count`
Obtiene el conteo de notificaciones no leídas

### PUT `/api/notifications/:id/read`
Marca una notificación como leída

### PUT `/api/notifications/read-all`
Marca todas las notificaciones como leídas

### DELETE `/api/notifications/:id`
Elimina una notificación

### POST `/api/notifications`
Crea una notificación personalizada

**Body:**
```json
{
  "tipo": "sistema",
  "mensaje": "Mensaje de la notificación",
  "datos_adicionales": { "key": "value" }
}
```

## 🎨 Personalización

### Cambiar Intervalo de Polling

En `src/context/NotificationContext.jsx`, línea ~142:

```javascript
const interval = setInterval(() => {
  loadNotifications();
}, 30000); // 30000ms = 30 segundos
```

### Duración de Toast

En `src/main.jsx`:

```javascript
<Toaster 
  position="top-right"
  toastOptions={{
    duration: 3000, // 3 segundos
  }}
/>
```

### Tipos de Notificación

Tipos disponibles (definidos en la base de datos):
- `nuevo_pedido` - Nuevo pedido recibido
- `pedido_actualizado` - Estado actualizado
- `pedido_completado` - Pedido completado
- `pedido_cancelado` - Pedido cancelado
- `cliente_nuevo` - Nuevo cliente
- `sistema` - Mensaje del sistema
- `alerta` - Alerta importante

## 🧪 Pruebas

### 1. Verificar panel de notificaciones

- Abre el dashboard en http://localhost:5173
- Click en el icono de campana
- Deberías ver 4 notificaciones de ejemplo (3 no leídas)

### 2. Probar marcar como leída

- Click en el checkmark de una notificación
- El contador debería decrementar
- La notificación cambia de color

### 3. Probar nueva notificación

Desde el backend (usando Postman, Insomnia, o curl):

```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "sistema",
    "mensaje": "🎉 Prueba de notificación desde API"
  }'
```

### 4. Probar con nuevo pedido

Crea un pedido desde el dashboard y verifica que aparece una notificación automática.

## 🐛 Troubleshooting

### El panel no abre
- Verifica que `NotificationProvider` está en `main.jsx`
- Revisa la consola del navegador para errores

### No aparecen notificaciones
- Verifica que la tabla `notificaciones` existe en Supabase
- Ejecuta el script `INSTALL_NOTIFICACIONES.sql`
- Revisa que el backend está corriendo sin errores

### Errores en el backend
```
error: Could not find the table 'public.notificaciones'
```
**Solución:** Ejecuta el script SQL en Supabase

### El contador no se actualiza
- Verifica que el polling está activo (30 seg)
- Revisa la pestaña Network en DevTools
- Confirma que la API responde correctamente

## 📚 Documentación Adicional

- **Guía Completa:** [NOTIFICACIONES.md](./NOTIFICACIONES.md)
- **Script SQL:** [INSTALL_NOTIFICACIONES.sql](./INSTALL_NOTIFICACIONES.sql)

## ✅ Checklist de Verificación

- [ ] Script SQL ejecutado en Supabase
- [ ] Tabla `notificaciones` creada
- [ ] 7 notificaciones de ejemplo insertadas
- [ ] Backend corriendo sin errores
- [ ] Frontend corriendo sin errores
- [ ] Panel de notificaciones se abre al click
- [ ] Badge muestra contador correcto
- [ ] Marcar como leída funciona
- [ ] Eliminar notificación funciona
- [ ] Toast notifications aparecen
- [ ] Dark mode funciona correctamente

## 🎉 ¡Listo!

El sistema de notificaciones está completamente implementado y listo para usar.

**Próximos pasos opcionales:**
- Implementar WebSockets para notificaciones en tiempo real sin polling
- Agregar notificaciones push (PWA)
- Crear preferencias de usuario para tipos de notificaciones
- Implementar sistema de archivado
