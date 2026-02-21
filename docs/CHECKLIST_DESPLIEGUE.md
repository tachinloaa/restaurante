# Checklist de Despliegue - El Rinconcito

## ✅ Pre-Despliegue

### 1. Variables de Entorno Configuradas

Verifica que estas variables estén en el dashboard de Render:

#### Obligatorias
- [ ] `ADMIN_PHONE_NUMBER` (ej: +5215512345678)
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_KEY`
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_WHATSAPP_CLIENTES`

#### Automáticas (configuradas por render.yaml)
- [x] `REDIS_URL` (conectada automáticamente)
- [x] `REDIS_ENABLED=true`
- [x] `NODE_ENV=production`
- [x] `JWT_SECRET` (generado automáticamente)

#### Opcionales
- [ ] `FRONTEND_URL` (URL de tu frontend)
- [ ] `LOG_LEVEL=info`

---

## 🚀 Pasos para Desplegar

### 1. Verificar Código Localmente

```bash
# Desde la carpeta backend
cd backend

# Verificar que no hay errores
npm install
npm start
```

Si el servidor inicia sin errores, ¡perfecto! ✅

### 2. Preparar Git

```bash
# Volver a la raíz del proyecto
cd ..

# Ver qué archivos cambiaron
git status

# Deberías ver:
# - backend/render.yaml (modificado)
# - backend/package.json (modificado)
# - backend/.env.example (modificado)
# - backend/src/... (varios archivos nuevos/modificados)
# - docs/CONFIGURAR_REDIS_RENDER.md (nuevo)
# - IMPLEMENTACION_MEJORAS.md (nuevo)
```

### 3. Hacer Commit

```bash
# Agregar todos los cambios
git add .

# Hacer commit
git commit -m "feat: implementar mejoras de seguridad y Redis

✨ Nuevas funcionalidades:
- Soporte para Redis (sesiones persistentes)
- Validación internacional de teléfonos
- Sistema de horario automático (7 AM - 10 PM)
- Notificaciones al admin de errores críticos
- Rate limiting para webhooks
- Retry logic para Twilio

🔒 Seguridad:
- ADMIN_PHONE_NUMBER ahora obligatorio
- Validación Twilio sin bypass en producción
- Validación estricta de URLs de media

📦 Infraestructura:
- render.yaml actualizado con Redis
- Nuevas dependencias: express-rate-limit, redis

📚 Documentación:
- CONFIGURAR_REDIS_RENDER.md
- IMPLEMENTACION_MEJORAS.md"
```

### 4. Subir a GitHub

```bash
# Push a la rama principal
git push origin main

# O si usas master:
# git push origin master
```

### 5. Configurar en Render

#### Opción A: Blueprint (Recomendado) 🚀

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Blueprint"**
3. Conecta tu repositorio
4. Render leerá `render.yaml` automáticamente
5. Click **"Apply"**
6. Espera a que cree los servicios (2-3 minutos)

Render creará:
- ✅ Redis service
- ✅ Web service (backend)
- ✅ Variables automáticas

#### Opción B: Manual

Si ya tienes servicios creados:

1. **Crear Redis:**
   - New + → Redis
   - Name: `el-rinconcito-redis`
   - Region: Oregon
   - Plan: Free
   - Create

2. **Actualizar Backend:**
   - Ve a tu Web Service
   - Environment → Add:
     ```
     REDIS_URL=<copia Internal Connection String del Redis>
     REDIS_ENABLED=true
     ADMIN_PHONE_NUMBER=+5215512345678
     ```
   - Save changes

### 6. Verificar Despliegue

Una vez desplegado, verifica:

#### En los Logs del Backend

Busca estos mensajes:

```
✅ Variables de entorno cargadas
✅ Redis conectado
✅ Redis listo para usar
✅ Servidor corriendo en puerto 3000
```

#### Probar el Bot

1. Envía mensaje de WhatsApp: **"Hola"**
2. El bot debe responder normalmente
3. Reinicia el servicio en Render
4. Envía otro mensaje
5. El bot debe recordar la sesión (no reiniciará la conversación)

Si todo funciona, ¡Redis está activo! ✅

---

## 🔍 Verificación Post-Despliegue

### Funcionalidades a Probar

- [ ] Bot responde a mensajes de WhatsApp
- [ ] Sesiones persisten después de reiniciar
- [ ] Horario de atención funciona (prueba fuera de 7 AM - 10 PM)
- [ ] Admin recibe notificaciones de nuevos pedidos
- [ ] Rate limiting bloquea spam (envía muchos mensajes seguidos)
- [ ] Validación de teléfonos internacionales funciona
- [ ] Validación de precios funciona
- [ ] Comprobantes de pago se validan correctamente

### Comandos de Verificación

```bash
# Probar endpoint de salud
curl https://tu-app.onrender.com/api/health

# Debería responder:
# {"success":true,"message":"API funcionando correctamente"}
```

---

## 📊 Monitoreo

### Dashboard de Render

Monitorea:
- **CPU Usage:** Debería ser < 50% normalmente
- **Memory Usage:** Debería ser < 500 MB
- **Redis Memory:** Debería ser < 25 MB

### Logs Importantes

**✅ Normal:**
```
✅ Redis conectado
Sesión actualizada para whatsapp:+...
Mensaje enviado a cliente ...
```

**⚠️ Advertencias (normales):**
```
⚠️ Webhook sin firma (modo desarrollo)
Rate limit excedido para: ...
```

**❌ Errores (requieren atención):**
```
❌ Error validando firma
❌ Redis Error: ECONNREFUSED
❌ Error al enviar mensaje
```

---

## 🔄 Rollback (Si algo sale mal)

### Opción 1: Revertir Commit

```bash
# Ver historial
git log --oneline

# Revertir al commit anterior
git revert HEAD

# Push
git push origin main
```

### Opción 2: Desactivar Redis Temporalmente

En Render Environment:
```bash
REDIS_ENABLED=false
```

El sistema automáticamente usará memoria.

---

## 📞 Ayuda

### Errores Comunes

**Error: "ADMIN_PHONE_NUMBER no configurado"**
```bash
# Solución: Agregar variable en Render
ADMIN_PHONE_NUMBER=+5215512345678
```

**Error: "Redis Error: ECONNREFUSED"**
```bash
# Solución: Verificar que Redis service esté corriendo
# Y que REDIS_URL sea correcta
```

**Error: "Firma de Twilio inválida"**
```bash
# Solución: Configurar URL del webhook en Twilio Console
https://tu-app.onrender.com/api/webhook
```

---

## ✅ Todo Listo

Cuando todos los items estén marcados:

- [x] Código subido a GitHub
- [x] Servicios creados en Render
- [x] Variables configuradas
- [x] Redis conectado
- [x] Bot funcionando
- [x] Sesiones persistentes
- [x] Notificaciones al admin funcionando

¡Tu bot mejorado está en producción! 🎉🌮

---

## 📚 Documentación Adicional

- [CONFIGURAR_REDIS_RENDER.md](CONFIGURAR_REDIS_RENDER.md) - Guía detallada de Redis
- [IMPLEMENTACION_MEJORAS.md](../IMPLEMENTACION_MEJORAS.md) - Todas las mejoras implementadas
- [render.yaml](../backend/render.yaml) - Configuración de infraestructura
