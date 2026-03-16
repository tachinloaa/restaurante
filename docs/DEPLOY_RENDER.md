# 🚀 Despliegue en Render

## ¿Por qué Render?
- ✅ **750 horas gratis al mes** (suficiente para 1 servicio 24/7)
- ✅ **Sin límite de requests** (no se acaba como Netlify)
- ✅ Despliegues automáticos desde GitHub
- ✅ PostgreSQL gratis incluido
- ✅ SSL/HTTPS automático

---

## 📋 Paso 1: Crear cuenta en Render

1. Ve a: https://render.com
2. Click en **"Get Started for Free"**
3. Regístrate con tu cuenta de GitHub (recomendado)
4. Autoriza a Render para acceder a tus repositorios

---

## 🔧 Paso 2: Desplegar el Backend

### 2.1 Crear el servicio

1. En el dashboard de Render, click en **"New +"**
2. Selecciona **"Web Service"**
3. Conecta tu repositorio: **tachinloaa/restaurante**
4. Render detectará automáticamente el `render.yaml`
5. Click en **"Apply"**

### 2.2 Configurar variables de entorno

En la sección **Environment**, agrega estas variables:

```env
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=tu_supabase_url
SUPABASE_KEY=tu_supabase_key

# Twilio
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_PHONE_NUMBER=tu_numero_twilio
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_WHATSAPP_CLIENTES=whatsapp:+525636399034
TWILIO_WHATSAPP_ADMIN=whatsapp:+525636399034

# Frontend
FRONTEND_URL=https://tu-frontend.netlify.app

# Logging
LOG_LEVEL=info
```

**IMPORTANTE:** Usa tus valores reales de Supabase y Twilio.

### 2.3 Configurar el webhook de Twilio

Una vez desplegado, obtendrás una URL como:
```
https://el-rinconcito-backend.onrender.com
```

**Configura el webhook en Twilio:**
1. Ve a: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
2. En **WHEN A MESSAGE COMES IN**, pega:
   ```
   https://el-rinconcito-backend.onrender.com/api/webhooks/whatsapp
   ```
3. Método: **POST**
4. Click en **Save**

---

## 🌐 Paso 3: Actualizar el Frontend

### 3.1 Actualizar la URL del backend

1. Ve a tu proyecto en Netlify
2. En **Site configuration** → **Environment variables**
3. Cambia `VITE_API_URL` a tu nueva URL de Render:
   ```
   VITE_API_URL=https://el-rinconcito-backend.onrender.com/api
   ```
4. Redeploya el frontend

---

## ⚡ Características del Plan Gratuito de Render

### ✅ Incluido:
- 750 horas/mes (31 días × 24h = 744h)
- 512 MB RAM
- SSL/HTTPS automático
- Despliegues ilimitados
- **Requests ilimitados** 🎉
- Git auto-deploy
- Health checks

### ⚠️ Limitaciones:
- El servicio se "duerme" después de 15 minutos de inactividad
- Tarda ~30 segundos en "despertar" con la primera petición
- Si superas las 750 horas, se apaga hasta el próximo mes

### 💡 Tip: Evitar que se duerma
Si quieres que esté siempre activo sin dormir:
1. Usar un servicio como **UptimeRobot** (gratis)
2. Hacer ping cada 10 minutos a tu API
3. URL a monitorear: `https://tu-backend.onrender.com/api/health`

---

## 🔍 Paso 4: Verificar el despliegue

### 4.1 Verificar el backend

Abre en tu navegador:
```
https://el-rinconcito-backend.onrender.com/api/health
```

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2026-02-05T..."
}
```

### 4.2 Probar el bot de WhatsApp

1. Envía "hola" a tu número de WhatsApp Sandbox
2. Deberías recibir el menú principal
3. Prueba hacer un pedido completo

---

## 📊 Monitoreo

En el dashboard de Render puedes ver:
- **Logs en tiempo real** (como Railway)
- Uso de recursos (CPU, RAM)
- Historial de despliegues
- Tiempo de actividad

---

## 🆚 Comparación: Railway vs Render vs Netlify

| Característica | Railway | Render | Netlify |
|----------------|---------|--------|---------|
| Horas gratis | 500h/mes | 750h/mes | N/A |
| Requests | Ilimitados | Ilimitados | ⚠️ 125k/mes |
| Se duerme | ✅ No | ⚠️ Sí (15 min) | N/A |
| Despliegues | Ilimitados | Ilimitados | 300/mes |
| PostgreSQL | $5/mes | ✅ Gratis | X |

**Conclusión:** Render es mejor que Netlify para APIs porque **no tiene límite de requests**.

---

## 🔄 Despliegues Automáticos

Render se conecta a tu repo de GitHub. Cada vez que hagas `git push`:
1. Render detecta el cambio
2. Ejecuta `npm install`
3. Inicia el servidor con `npm start`
4. Hace health check
5. Cambia al nuevo despliegue

Todo automático, como Railway.

---

## ⚙️ Comandos útiles

### Ver logs en tiempo real:
1. Ve a tu servicio en Render
2. Click en **"Logs"**
3. Los logs se actualizan automáticamente

### Forzar redespliegue:
1. Click en **"Manual Deploy"**
2. Selecciona **"Clear build cache & deploy"**

---

## 🚨 Solución de problemas

### El servicio no inicia
- Revisa los logs en Render
- Verifica que todas las variables de entorno estén configuradas
- Asegúrate que `npm start` funcione localmente

### El webhook no funciona
- Verifica la URL en Twilio
- Debe terminar en `/api/webhooks/whatsapp`
- Prueba la URL en el navegador primero

### Se queda "dormido"
- Es normal en el plan gratuito (después de 15 min inactivo)
- Usa UptimeRobot para mantenerlo activo
- O acepta los 30 segundos de delay en la primera petición

---

## 💰 Costo Real

**Plan Gratuito de Render:**
- $0/mes para el backend
- Requests ilimitados
- 750 horas (suficiente para 1 mes completo)

**Comparado con Railway:**
- Railway: 500h gratis, luego $5/mes
- Render: 750h gratis, luego se apaga

**Recomendación:** Render es mejor para proyectos pequeños porque te da **más horas gratis** y **sin límite de requests**.

---

## 📝 Siguiente paso

Una vez desplegado en Render:
1. Actualiza la URL del backend en Netlify
2. Configura el webhook en Twilio
3. Prueba el bot de WhatsApp
4. (Opcional) Configura UptimeRobot para mantenerlo activo

¡Listo! Tu backend estará en Render sin preocuparte por límites de requests.
