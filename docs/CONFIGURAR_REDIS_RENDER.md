# Configurar Redis en Render - El Rinconcito

## 📋 ¿Por qué Redis?

Redis mejora significativamente el rendimiento del bot al:
- ✅ Mantener sesiones persistentes entre reinicios
- ✅ Soportar múltiples instancias del servidor
- ✅ Mejorar velocidad de acceso a datos de sesión
- ✅ Liberar memoria del proceso principal

## 🚀 Configuración Automática (Recomendado)

El archivo `render.yaml` ya está configurado para crear Redis automáticamente.

### Paso 1: Subir Código a GitHub

```bash
# Desde la raíz del proyecto
git add .
git commit -m "feat: agregar soporte para Redis y mejoras de seguridad"
git push origin main
```

### Paso 2: Conectar con Render

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Click en **"New +"** → **"Blueprint"**
3. Selecciona tu repositorio de GitHub
4. Render detectará automáticamente el archivo `render.yaml`
5. Click en **"Apply"**

Render creará automáticamente:
- ✅ Servicio Redis (plan gratuito)
- ✅ Web Service (backend)
- ✅ Variable `REDIS_URL` conectada automáticamente

### Paso 3: Configurar Variables Faltantes

En el dashboard de tu Web Service, agrega estas variables:

```bash
# OBLIGATORIO
ADMIN_PHONE_NUMBER=+5215512345678

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-supabase-anon-key

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu-auth-token
TWILIO_WHATSAPP_CLIENTES=whatsapp:+14155238886

# Frontend
FRONTEND_URL=https://tu-app.pages.dev
```

**Nota:** `REDIS_URL` y `REDIS_ENABLED` ya están configuradas automáticamente.

---

## 🔧 Configuración Manual (Alternativa)

Si prefieres crear los servicios manualmente:

### Paso 1: Crear Servicio Redis

1. En Render Dashboard, click **"New +"** → **"Redis"**
2. Configuración:
   ```
   Name: el-rinconcito-redis
   Region: Oregon (o la más cercana)
   Plan: Free (25 MB suficiente para sesiones)
   Max Memory Policy: allkeys-lru
   ```
3. Click **"Create Redis"**
4. Espera a que se inicie (1-2 minutos)

### Paso 2: Obtener URL de Conexión

1. Ve a tu servicio Redis en Render
2. En la pestaña **"Info"**, busca:
   - **Internal Connection String** (si backend y Redis están en la misma región)
   - **External Connection String** (si están en regiones diferentes)
3. Copia la URL completa (comienza con `redis://`)

Ejemplo:
```
redis://red-xxxxxxxxxxxxx:6379
```

### Paso 3: Configurar Backend

1. Ve a tu Web Service (backend) en Render
2. Ve a **"Environment"**
3. Agrega estas variables:

```bash
# Redis
REDIS_URL=redis://red-xxxxxxxxxxxxx:6379
REDIS_ENABLED=true

# Admin (OBLIGATORIO)
ADMIN_PHONE_NUMBER=+5215512345678
```

4. Guarda cambios y Render reiniciará automáticamente

---

## ✅ Verificar que Funciona

### 1. Revisar Logs del Backend

En el dashboard de tu Web Service, ve a **"Logs"** y busca:

```
✅ Redis conectado
✅ Redis listo para usar
```

Si ves esto, ¡Redis está funcionando correctamente!

### 2. Probar una Conversación

Envía un mensaje al bot de WhatsApp:

```
Hola
```

En los logs deberías ver que las sesiones se guardan en Redis.

### 3. Verificar Persistencia

1. Reinicia el servicio backend en Render
2. Envía otro mensaje al bot
3. El bot debe recordar la sesión anterior (no reiniciará la conversación)

---

## 🆓 Límites del Plan Gratuito

### Redis Free en Render
- **Memoria:** 25 MB
- **Conexiones:** Ilimitadas
- **Persistencia:** Sí (con snapshots)
- **Expulsión:** LRU cuando se llena

### ¿25 MB es Suficiente?

Sí, más que suficiente:
- Cada sesión ocupa ~2-5 KB
- 25 MB = **5,000-12,500 sesiones** simultáneas
- Para un negocio pequeño/mediano, es perfecto

---

## 🔄 Sin Redis (Fallback Automático)

Si no configuras Redis:

- ✅ El sistema sigue funcionando
- ⚠️ Usa memoria del proceso (se pierde al reiniciar)
- ⚠️ No soporta múltiples instancias

Para desactivar Redis:

```bash
REDIS_ENABLED=false
```

---

## 🐛 Troubleshooting

### Error: "Redis Error: ECONNREFUSED"

**Causa:** No se puede conectar a Redis

**Solución:**
1. Verifica que el servicio Redis esté corriendo en Render
2. Verifica que `REDIS_URL` sea correcta
3. Si backend y Redis están en regiones diferentes, usa la **External Connection String**

### Error: "Redis: Maximum number of clients reached"

**Causa:** Demasiadas conexiones abiertas

**Solución:**
1. Reinicia el servicio backend
2. Verifica que no haya múltiples instancias conectándose
3. El sistema automáticamente reconecta

### Advertencia: "Redis no disponible, usando memoria"

**Causa:** Redis no está configurado o no está disponible

**Solución:**
- Esto es normal si `REDIS_ENABLED=false`
- Si quieres usar Redis, verifica la configuración

### Sesiones se Pierden al Reiniciar

**Problema:** Las sesiones no persisten después de un reinicio

**Verificar:**
1. ¿`REDIS_ENABLED=true`?
2. ¿`REDIS_URL` está configurada?
3. ¿Redis está corriendo en Render?

En los logs deberías ver:
```
✅ Redis conectado
```

Si ves:
```
⚠️ Redis no disponible, usando memoria
```

Redis no está configurado correctamente.

---

## 🔐 Seguridad

### Configuración de Red

El `render.yaml` está configurado con:

```yaml
ipAllowList: []
```

Esto significa:
- ✅ Solo servicios dentro de Render pueden conectarse
- ✅ No accesible desde internet público
- ✅ Conexión segura automática

### Contraseñas

Render genera automáticamente contraseñas seguras en la `REDIS_URL`:

```
redis://default:random-secure-password@redis-host:6379
```

No necesitas configurar nada manualmente.

---

## 📊 Monitoreo

### Ver Uso de Memoria

1. Ve a tu servicio Redis en Render
2. Dashboard muestra:
   - Memoria usada
   - Número de keys
   - Conexiones activas

### Limpiar Sesiones Expiradas

El sistema automáticamente:
- ✅ Expira sesiones después de 30 minutos de inactividad
- ✅ Redis elimina automáticamente keys expiradas (LRU)
- ✅ No requiere mantenimiento manual

---

## 🚀 Despliegue Final

### Checklist Antes de Subir

- [ ] `render.yaml` actualizado
- [ ] Variables de entorno configuradas en Render
- [ ] `ADMIN_PHONE_NUMBER` configurado
- [ ] Código subido a GitHub
- [ ] Blueprint aplicado en Render
- [ ] Redis creado y conectado
- [ ] Backend reiniciado

### Comandos para Subir

```bash
# 1. Verificar cambios
git status

# 2. Agregar todos los archivos
git add .

# 3. Commit con mensaje descriptivo
git commit -m "feat: agregar Redis, validaciones y mejoras de seguridad

- Soporte para Redis en producción
- Validación internacional de teléfonos
- Sistema de horario automático
- Notificaciones al admin de errores
- Rate limiting para webhooks
- Retry logic para Twilio"

# 4. Subir a GitHub
git push origin main
```

### En Render

1. Si usas Blueprint:
   - Render detecta cambios automáticamente
   - Click en **"Apply"** si hay cambios en `render.yaml`

2. Si es manual:
   - Los servicios se actualizan automáticamente al detectar el push

---

## 📞 Soporte

Si tienes problemas:

1. **Revisa los logs** en Render Dashboard
2. **Verifica las variables de entorno** estén correctas
3. **Confirma que Redis está corriendo**
4. **Busca mensajes de error específicos** en los logs

Common logs exitosos:

```
✅ Redis conectado
✅ Redis listo para usar
✅ Sesión actualizada para whatsapp:+...
🔄 Actividad renovada para whatsapp:+...
```

---

## 🎉 ¡Listo!

Tu bot ahora tiene:
- ✅ Sesiones persistentes con Redis
- ✅ Mejor rendimiento
- ✅ Soporta escalamiento horizontal
- ✅ Protección contra pérdida de datos

¡Disfruta de tu bot mejorado! 🌮🚀
