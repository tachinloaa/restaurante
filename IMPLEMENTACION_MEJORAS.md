# Implementación de Mejoras - El Rinconcito Bot

## 📋 Resumen de Mejoras Implementadas

### ✅ Completadas

1. **Corrección de Validación Twilio en Producción** ✅
   - Eliminado bypass de validación de firma Twilio
   - Mayor seguridad en webhooks

2. **Validación de Teléfono Internacional** ✅
   - Soporte para números de México, USA, Centroamérica, etc.
   - Funciones: `esValidoTelefonoInternacional`, `formatearTelefonoWhatsApp`

3. **Validación de Precios MXN** ✅
   - Validación específica para pesos mexicanos
   - Rango: $1.00 - $99,999.99
   - Máximo 2 decimales

4. **Número de Admin en Variables de Entorno** ✅
   - Variable obligatoria: `ADMIN_PHONE_NUMBER`
   - Sin valor predeterminado por seguridad

5. **Sistema de Horario de Atención** ✅
   - Horario: 7:00 AM - 10:00 PM (todos los días)
   - Mensajes automáticos cuando está cerrado
   - Archivo: `backend/src/utils/horario.js`

6. **Rate Limiting para Webhooks** ✅
   - 30 peticiones por minuto (normal)
   - 10 peticiones por 5 minutos (estricto)
   - Archivo: `backend/src/middlewares/rateLimiter.js`

7. **Validación de URLs de Media** ✅
   - Solo permitir URLs de Twilio
   - Validación de tipos de archivo (JPG, PNG, PDF)
   - Funciones: `esUrlMediaValida`, `esTipoMediaValido`

8. **Retry Logic para Twilio** ✅
   - 3 intentos automáticos
   - Backoff exponencial: 1s, 2s, 4s
   - Actualizado: `enviarMensajeCliente()`

9. **Sistema de Sesiones con Redis** ✅
   - Soporte para Redis en producción
   - Fallback a memoria en desarrollo
   - Archivo actualizado: `backend/src/services/sessionService.js`

10. **Notificaciones al Admin de Errores Críticos** ✅
    - Alertas automáticas de errores de BD, Twilio, Bot, API
    - Anti-spam integrado
    - Archivo: `backend/src/services/adminNotificationService.js`

---

## 🚀 Instalación

### 1. Instalar Dependencias Nuevas

```bash
cd backend
npm install
```

**Nuevas dependencias agregadas:**
- `express-rate-limit`: Rate limiting para webhooks
- `redis`: Gestión de sesiones en producción (opcional)

### 2. Actualizar Variables de Entorno

#### Desarrollo (`.env.development`)

```bash
# Obligatorio
ADMIN_PHONE_NUMBER=+5215512345678

# Redis (Opcional - usar memoria en desarrollo)
REDIS_URL=
REDIS_ENABLED=false
```

#### Producción (Render/Railway)

Agregar en el dashboard de tu plataforma:

```bash
# Obligatorio
ADMIN_PHONE_NUMBER=+5215512345678

# Redis (Recomendado para producción)
REDIS_URL=redis://default:password@tu-redis-host:6379
REDIS_ENABLED=true
```

---

## 📝 Cómo Usar las Nuevas Funcionalidades

### 1. Validación de Teléfono Internacional

```javascript
import { esValidoTelefonoInternacional, formatearTelefonoWhatsApp } from './utils/validators.js';

// Validar
const esValido = esValidoTelefonoInternacional('+5215512345678'); // true
const esValido2 = esValidoTelefonoInternacional('+14155551234'); // true (USA)

// Formatear para WhatsApp
const formatted = formatearTelefonoWhatsApp('5512345678'); // whatsapp:+525512345678
```

### 2. Validación de Precios MXN

```javascript
import { esValidoPrecioMXN, formatearPrecioMXN } from './utils/validators.js';

// Validar
const resultado = esValidoPrecioMXN(150.50);
console.log(resultado); // { valido: true, valor: 150.5 }

const resultado2 = esValidoPrecioMXN(0.50);
console.log(resultado2); // { valido: false, error: 'El precio mínimo es $1.00' }

// Formatear
const precio = formatearPrecioMXN(1500.50); // $1,500.50
```

### 3. Sistema de Horario

```javascript
import { verificarHorario, getMensajeCerrado } from './utils/horario.js';

// Verificar si está abierto
const info = verificarHorario();
console.log(info.abierto); // true/false
console.log(info.mensaje); // Mensaje descriptivo

// En botService.js
async iniciarConversacion(telefono) {
  const infoHorario = verificarHorario();
  
  if (!infoHorario.abierto) {
    return {
      success: true,
      mensaje: getMensajeCerrado(infoHorario)
    };
  }
  
  // Continuar con el flujo normal...
}
```

### 4. Notificaciones al Admin

```javascript
import adminNotificationService from './services/adminNotificationService.js';

// Notificar error crítico
await adminNotificationService.notificarErrorCritico(
  'BASE DE DATOS',
  'No se pudo conectar a Supabase',
  { error: error.message, code: error.code }
);

// Notificar error de Twilio
await adminNotificationService.notificarErrorTwilio(
  error,
  'Al enviar mensaje de confirmación'
);

// Notificar error del bot
await adminNotificationService.notificarErrorBot(
  error,
  telefono,
  estado
);

// Notificar inicio del sistema
await adminNotificationService.notificarInicioSistema();
```

### 5. Sesiones con Redis

Las sesiones ahora funcionan automáticamente con Redis si está configurado:

```javascript
import SessionService from './services/sessionService.js';

// Todos los métodos ahora son async
const session = await SessionService.getSession(telefono);
await SessionService.setSession(telefono, { estado: 'MENU' });
await SessionService.agregarAlCarrito(telefono, producto);
const carrito = await SessionService.getCarrito(telefono);
```

**⚠️ Importante:** Actualiza todos los usos de `SessionService` para usar `await`.

---

## 🔧 Configuración de Redis

### Opción 1: Render (Recomendado)

1. Ve a tu dashboard de Render
2. Crea un nuevo servicio **Redis**
3. Copia la URL de conexión (Internal Connection String)
4. Agrégala como variable de entorno en tu Web Service:
   ```
   REDIS_URL=redis://default:password@redis-internal-url:6379
   REDIS_ENABLED=true
   ```

### Opción 2: Redis Cloud (Gratuito)

1. Crea cuenta en [Redis Cloud](https://redis.com/try-free/)
2. Crea una base de datos gratuita
3. Copia la URL de conexión
4. Agrégala en tus variables de entorno

### Opción 3: Sin Redis (Solo Desarrollo)

Si no quieres usar Redis todavía:
```bash
REDIS_ENABLED=false
```

El sistema automáticamente usará memoria.

---

## 🧪 Pruebas

### Probar Validaciones

```bash
cd backend
node src/testValidaciones.js
```

### Probar Horario

```javascript
import { verificarHorario } from './src/utils/horario.js';

// Simular diferentes horas
const horarios = [
  new Date('2026-02-16T06:30:00'), // Antes de abrir
  new Date('2026-02-16T12:00:00'), // Abierto
  new Date('2026-02-16T22:30:00'), // Cerrado
];

horarios.forEach(fecha => {
  const info = verificarHorario(fecha);
  console.log(info);
});
```

### Probar Rate Limiting

Envía múltiples peticiones seguidas al webhook:

```bash
# Enviar 35 peticiones (debería bloquear después de 30)
for i in {1..35}; do
  curl -X POST http://localhost:3000/webhook \
    -H "Content-Type: application/json" \
    -d '{"From":"whatsapp:+5215512345678","Body":"test"}' &
done
```

---

## 📊 Monitoring

### Ver Sesiones Activas

```javascript
import SessionService from './services/sessionService.js';

const stats = SessionService.getEstadisticas();
console.log(`Total: ${stats.total}, Activas: ${stats.activas}`);
```

### Ver Notificaciones Enviadas

Las notificaciones al admin tienen anti-spam integrado:
- Máximo 5 notificaciones del mismo tipo en 10 minutos
- Se limpian automáticamente cada 15 minutos

---

## 🔒 Seguridad

### Cambios Importantes

1. **Validación Twilio**: Ahora se valida estrictamente la firma en producción
2. **Rate Limiting**: Protección contra spam en webhooks
3. **Admin Phone**: Ya no hay valor predeterminado (más seguro)
4. **URL Media**: Solo se aceptan URLs de Twilio

### Checklist de Seguridad

- [ ] `ADMIN_PHONE_NUMBER` configurado en producción
- [ ] Validación Twilio habilitada (sin bypass)
- [ ] Rate limiting activado en webhooks
- [ ] Redis con contraseña en producción
- [ ] Variables sensibles no en el código

---

## 🐛 Troubleshooting

### Error: "ADMIN_PHONE_NUMBER no configurado"

**Solución:** Agrega la variable en tu `.env.development` o en el dashboard de producción:
```bash
ADMIN_PHONE_NUMBER=+5215512345678
```

### Redis no se conecta

**Solución 1:** Verifica la URL de Redis:
```bash
echo $REDIS_URL
```

**Solución 2:** Desactiva Redis temporalmente:
```bash
REDIS_ENABLED=false
```

### Rate limit bloquea usuarios legítimos

**Solución:** Ajusta los límites en `rateLimiter.js`:
```javascript
max: 50, // Aumentar de 30 a 50
windowMs: 2 * 60 * 1000, // Aumentar ventana a 2 minutos
```

### Sesiones no persisten

**Problema:** Si usas memoria (no Redis), las sesiones se pierden al reiniciar el servidor.

**Solución:** Configura Redis para producción.

---

## 📚 Archivos Modificados

### Nuevos Archivos
- `backend/src/utils/horario.js`
- `backend/src/middlewares/rateLimiter.js`
- `backend/src/services/adminNotificationService.js`

### Archivos Actualizados
- `backend/src/utils/validators.js` (funciones nuevas)
- `backend/src/config/environment.js` (Redis config)
- `backend/src/services/sessionService.js` (soporte Redis)
- `backend/src/services/twilioService.js` (retry logic)
- `backend/src/middlewares/twilioValidator.js` (sin bypass)
- `backend/src/middlewares/errorHandler.js` (notificaciones)
- `backend/src/routes/webhookRoutes.js` (rate limiting)
- `backend/.env.example` (nuevas variables)
- `backend/package.json` (nuevas dependencias)

---

## 🎯 Próximos Pasos (No Implementados Aún)

### Prioridad Baja
- [ ] Sistema de calificaciones
- [ ] Historial de pedidos para clientes
- [ ] Tests unitarios

### No Implementar Todavía
- [ ] Sistema de cupones/promociones
- [ ] Confirmación de pedido por admin

---

## 📞 Soporte

Si tienes problemas con la implementación:
1. Revisa los logs: `backend/logs/`
2. Verifica las variables de entorno en `.env.development`
3. Asegúrate de haber instalado las nuevas dependencias: `npm install`
4. Verifica que Redis esté conectado (si lo usas)

---

## ✅ Checklist de Implementación

- [ ] Instalar nuevas dependencias (`npm install`)
- [ ] Configurar `ADMIN_PHONE_NUMBER` en variables de entorno
- [ ] (Opcional) Configurar Redis para producción
- [ ] Actualizar código para usar `await` con SessionService
- [ ] Desplegar a producción
- [ ] Probar validaciones con números internacionales
- [ ] Verificar que el horario funcione correctamente
- [ ] Confirmar que las notificaciones al admin lleguen
- [ ] Verificar que rate limiting bloquee spam

---

¡Todo listo para implementar! 🚀
